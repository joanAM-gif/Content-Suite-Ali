"""
Recuperacion de contexto de marca (RAG) para el Modulo II.

En vez de inyectar el manual de marca completo en cada prompt, se busca
por similitud (distancia coseno, operador <=> de pgvector) solo los
chunks relevantes a lo que el creador quiere generar. Esto es lo que el
reto llama "consultar el manual de marca antes de generar cualquier
texto".

Este span queda registrado en Langfuse como "retriever", con el query
de entrada y los chunks recuperados como salida: es la evidencia
concreta de "que contexto se recupero del RAG" que pide el Modulo IV.
"""
from app.database import get_connection
from app.services.embeddings import embed_text
import app.services.observability as observability


@observability.observe(name="pgvector-retrieve-brand-context", as_type="retriever")
def retrieve_brand_context(product: str, query: str, top_k: int = 5) -> list[dict]:
    """Devuelve los `top_k` chunks del manual de marca mas relevantes para `query`."""
    query_vector = embed_text(query)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chunk_type, content, embedding <=> %s::vector AS distance
                FROM brand_manual_chunks
                WHERE lower(product) = lower(%s)
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (query_vector, product, query_vector, top_k),
            )
            rows = cur.fetchall()

    chunks = [
        {"chunk_type": chunk_type, "content": content, "distance": float(distance)}
        for chunk_type, content, distance in rows
    ]

    observability.get_client().update_current_span(
        input={"product": product, "query": query, "top_k": top_k},
        output=chunks,
        metadata={"chunks_retrieved": len(chunks)},
    )
    return chunks