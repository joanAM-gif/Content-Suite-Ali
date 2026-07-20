"""
Modulo III: Governance & Multimodal Audit.

Dos responsabilidades separadas, una por cada aprobador:

- Aprobador A revisa el TEXTO generado en el Modulo II y lo aprueba o
  rechaza (GET /review/pending, PATCH /review/{id}).
- Aprobador B sube una IMAGEN y el sistema la audita contra el manual de
  marca usando el modelo de vision de Google AI Studio (POST /audit-image).

`audit_product_image` esta decorado con @observe(): es el trace raiz que
agrupa el retrieval del RAG (Modulo I) y la generacion de vision
(Gemini), y en Langfuse se ve directamente cuanto tomo cada parte y el
total - la "auditoria de procesos" que pide el Modulo IV.
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.database import get_connection
from app.schemas import ContentPieceOut, ImageAuditResponse, ReviewUpdate
from app.services.observability import observe
from app.services.rag import retrieve_brand_context
from app.services.vision import audit_image

router = APIRouter(tags=["Modulo III - Governance & Multimodal Audit"])


@router.get("/review/pending", response_model=list[ContentPieceOut])
def list_pending_reviews() -> list[ContentPieceOut]:
    """Piezas de contenido en estado 'pendiente', para la bandeja del Aprobador A."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, product, content_type, content, status, reviewer_note
                    FROM content_pieces
                    WHERE status = 'pendiente'
                    ORDER BY created_at DESC
                    """
                )
                rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error consultando piezas pendientes: {exc}") from exc

    return [
        ContentPieceOut(
            id=row[0], product=row[1], content_type=row[2],
            content=row[3], status=row[4], reviewer_note=row[5],
        )
        for row in rows
    ]


@router.patch("/review/{piece_id}", response_model=ContentPieceOut)
def review_content_piece(piece_id: int, payload: ReviewUpdate) -> ContentPieceOut:
    """Aprobador A aprueba o rechaza una pieza de contenido generada en el Modulo II."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE content_pieces
                    SET status = %s, reviewer_note = %s, updated_at = now()
                    WHERE id = %s
                    RETURNING id, product, content_type, content, status, reviewer_note
                    """,
                    (payload.status, payload.reviewer_note, piece_id),
                )
                row = cur.fetchone()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error actualizando la pieza de contenido: {exc}") from exc

    if row is None:
        raise HTTPException(status_code=404, detail=f"No existe la pieza de contenido {piece_id}.")

    return ContentPieceOut(
        id=row[0], product=row[1], content_type=row[2],
        content=row[3], status=row[4], reviewer_note=row[5],
    )


@router.post("/audit-image", response_model=ImageAuditResponse)
@observe(name="POST /audit-image")
async def audit_product_image(
    producto: str = Form(...),
    image: UploadFile = File(...),
) -> ImageAuditResponse:
    """Aprobador B sube una imagen que se audita contra el manual de marca del producto."""
    try:
        brand_chunks = retrieve_brand_context(
            product=producto,
            query=f"reglas visuales y de tono de marca de {producto}",
            top_k=8,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error recuperando el manual de marca: {exc}") from exc

    if not brand_chunks:
        raise HTTPException(
            status_code=404,
            detail=f"No hay manual de marca indexado para '{producto}'. Genera uno primero con POST /brand.",
        )

    image_bytes = await image.read()

    try:
        verdict = audit_image(
            product=producto,
            brand_rules=[chunk["content"] for chunk in brand_chunks],
            image_bytes=image_bytes,
            mime_type=image.content_type or "image/jpeg",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Error auditando la imagen con Gemini: {exc}") from exc

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO image_audits (product, cumple, razon)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (producto, verdict["cumple"], verdict["razon"]),
                )
                audit_id = cur.fetchone()[0]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error guardando la auditoria: {exc}") from exc

    return ImageAuditResponse(
        id=audit_id, producto=producto,
        cumple=verdict["cumple"], razon=verdict["razon"],
    )
