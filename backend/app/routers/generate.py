"""
Modulo II: Creative Engine.

Flujo:
1. El Creador pide una pieza de contenido (descripcion, guion o prompt
   de imagen) con un brief libre.
2. Antes de generar, se hace similarity search en pgvector sobre los
   chunks del manual de marca de ese producto (Modulo I) - "el sistema
   debe realizar una consulta al manual de marca antes de generar
   cualquier texto", como pide el reto.
3. Los chunks recuperados se inyectan como contexto obligatorio en el
   prompt a Groq.
4. La pieza generada se guarda en `content_pieces` con status
   'pendiente', junto con el contexto usado (auditable), lista para
   que el Aprobador A la revise en el Modulo III.

El endpoint esta decorado con @observe(): agrupa en un solo trace de
Langfuse el span de retrieval (RAG) y el span de generacion (Groq).
"""
import json

from fastapi import APIRouter, HTTPException

from app.database import get_connection
from app.schemas import ContextChunk, GenerateRequest, GenerateResponse
from app.services.llm import generate_content
from app.services.observability import observe
from app.services.rag import retrieve_brand_context

router = APIRouter(prefix="/generate", tags=["Modulo II - Creative Engine"])


@router.post("", response_model=GenerateResponse)
@observe(name="POST /generate")
def generate_piece(payload: GenerateRequest) -> GenerateResponse:
    # 1. Recuperar contexto de marca relevante (RAG)
    try:
        context_chunks = retrieve_brand_context(
            product=payload.producto,
            query=f"{payload.content_type}: {payload.brief}",
            top_k=payload.top_k,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error recuperando contexto del RAG: {exc}") from exc

    if not context_chunks:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hay manual de marca indexado para '{payload.producto}'. "
                "Genera uno primero con POST /brand."
            ),
        )

    # 2. Generar el contenido respetando ese contexto
    try:
        content = generate_content(
            content_type=payload.content_type,
            product=payload.producto,
            brief=payload.brief,
            brand_context=[chunk["content"] for chunk in context_chunks],
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Error generando contenido con Groq: {exc}") from exc

    # 3. Persistir la pieza generada, en estado 'pendiente' para el Modulo III
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO content_pieces (product, content_type, content, context_used, status)
                    VALUES (%s, %s, %s, %s, 'pendiente')
                    RETURNING id, status
                    """,
                    (payload.producto, payload.content_type, content, json.dumps(context_chunks)),
                )
                piece_id, status = cur.fetchone()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error guardando la pieza generada: {exc}") from exc

    return GenerateResponse(
        id=piece_id,
        producto=payload.producto,
        content_type=payload.content_type,
        content=content,
        context_used=[ContextChunk(**chunk) for chunk in context_chunks],
        status=status,
    )
