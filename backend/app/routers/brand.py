"""
Modulo I: Brand DNA Architect.

Flujo:
1. El Creador manda producto/tono/publico.
2. Groq genera el Manual de Marca Estructurado (JSON).
3. El manual se trocea en chunks pequenos y auto-contenidos (una idea por
   chunk), para que la busqueda por similitud del Modulo II sea precisa.
4. Cada chunk se embebe (Google AI Studio) y se guarda en pgvector.

Esta tabla (brand_manual_chunks) es la "fuente de verdad" que consultan
los modulos II y III antes de generar o auditar cualquier contenido.

El endpoint esta decorado con @observe(): es el trace raiz de Langfuse
para esta operacion, y agrupa como spans hijos la generacion del manual
y cada embedding calculado.
"""
from fastapi import APIRouter, HTTPException  # type: ignore[reportMissingImports]

from app.database import get_connection
from app.schemas import BrandManual, BrandRequest, BrandResponse
from app.services.embeddings import embed_text
from app.services.llm import generate_brand_manual
from app.services import observability

observe = getattr(observability, "observe", lambda name: (lambda func: func))

router = APIRouter(prefix="/brand", tags=["Modulo I - Brand DNA Architect"])


def _manual_to_chunks(producto: str, manual: dict) -> list[tuple[str, str]]:
    """Convierte el manual en pares (chunk_type, texto) listos para embeber."""
    chunks: list[tuple[str, str]] = [
        ("tono", f"Tono de marca para {producto}: {manual['tono']}"),
        ("publico", f"Publico objetivo de {producto}: {manual['publico']}"),
        ("resumen", f"Resumen de marca de {producto}: {manual['resumen']}"),
    ]
    for i, regla in enumerate(manual.get("prohibiciones", [])):
        chunks.append((f"prohibicion_{i}", f"Regla prohibida para {producto}: {regla}"))
    for i, mensaje in enumerate(manual.get("mensajes_clave", [])):
        chunks.append((f"mensaje_{i}", f"Mensaje clave de {producto}: {mensaje}"))
    return chunks


@router.post("", response_model=BrandResponse)
@observe(name="POST /brand")
def create_brand_manual(payload: BrandRequest) -> BrandResponse:
    try:
        manual_dict = generate_brand_manual(payload.producto, payload.tono, payload.publico)
    except Exception as exc:  # noqa: BLE001 - queremos capturar cualquier fallo del LLM
        raise HTTPException(status_code=502, detail=f"Error generando el manual con Groq: {exc}") from exc

    chunks = _manual_to_chunks(payload.producto, manual_dict)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                for chunk_type, content in chunks:
                    vector = embed_text(content)
                    cur.execute(
                        """
                        INSERT INTO brand_manual_chunks (product, chunk_type, content, embedding)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (payload.producto, chunk_type, content, vector),
                    )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error indexando el manual: {exc}") from exc

    return BrandResponse(
        producto=payload.producto,
        manual=BrandManual(**manual_dict),
        chunks_indexados=len(chunks),
    )

@router.get("/search", response_model=list[str])
def search_brand_products(q: str = "") -> list[str]:
    """
    Sugerencias de productos para el buscador del Creador (extra sobre lo
    pedido en el reto). Antes, buscar un manual exigia escribir el nombre
    del producto exacto (aunque fuera case-insensitive); si dos productos
    comparten una palabra -- por ejemplo "Barra de cereal NutriMax" y
    "Barra energetica NutriMax Pro" -- no habia forma de descubrir el
    segundo sin saber su nombre completo de antemano.

    Este endpoint hace una busqueda por coincidencia parcial
    (case-insensitive, `ILIKE '%q%'`) sobre los productos ya indexados en
    `brand_manual_chunks` y devuelve nombres de producto unicos, para que
    el frontend los muestre como sugerencias mientras el usuario escribe.
    """
    q = q.strip()
    if len(q) < 2:
        return []

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT DISTINCT product
                    FROM brand_manual_chunks
                    WHERE product ILIKE %s
                    ORDER BY product ASC
                    LIMIT 10
                    """,
                    (f"%{q}%",),
                )
                rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error buscando productos: {exc}") from exc

    return [row[0] for row in rows]

    # Se usa el nombre del producto tal como se guardo originalmente (puede
    # diferir en mayusculas/minusculas de lo que el usuario escribio al buscar).
    producto_real = rows[0][2]

    tono = publico = resumen = ""
    prohibiciones: list[str] = []
    mensajes_clave: list[str] = []

    for chunk_type, content, _product in rows:
        # El contenido siempre tiene el formato "Etiqueta: valor"; se corta
        # por el primer ": " en vez de depender de la capitalizacion exacta
        # del producto (que puede no coincidir con lo que se busco).
        value = content.split(": ", 1)[1] if ": " in content else content
        if chunk_type == "tono":
            tono = value
        elif chunk_type == "publico":
            publico = value
        elif chunk_type == "resumen":
            resumen = value
        elif chunk_type.startswith("prohibicion_"):
            prohibiciones.append(value)
        elif chunk_type.startswith("mensaje_"):
            mensajes_clave.append(value)

    return BrandResponse(
        producto=producto_real,
        manual=BrandManual(
            tono=tono,
            publico=publico,
            prohibiciones=prohibiciones,
            mensajes_clave=mensajes_clave,
            resumen=resumen,
        ),
        chunks_indexados=len(rows),
    )