"""
Generacion de embeddings via Google AI Studio (models/text-embedding-004).

Decision de diseno: se usa el mismo proveedor (Google AI Studio) que el
Modulo III de vision, en lugar de correr un modelo local tipo
sentence-transformers. Esto evita cargar ~500MB de pesos de un modelo
en el free tier de Render (512MB de RAM) y mantiene el stack alineado
con las herramientas "Zero Cost" sugeridas en el reto.
"""
import json
from urllib import error as urllib_error, request as urllib_request

from app.config import settings
from app.services import observability

_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    f"{settings.EMBEDDING_MODEL}:embedContent"
)


@observability.observe(name="google-embed-text", as_type="embedding")
def embed_text(text: str) -> list[float]:
    """Devuelve el vector de embedding (768 dims) para un texto dado."""
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY no esta configurada.")

    payload = {
        "model": settings.EMBEDDING_MODEL,
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": settings.EMBEDDING_DIM,
    }
    # Use urllib to avoid an external dependency on httpx
    url = f"{_EMBED_URL}?key={settings.GOOGLE_API_KEY}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read()
    except urllib_error.HTTPError as e:
        # re-raise with body for easier debugging
        raise RuntimeError(f"HTTP {e.code}: {e.reason}") from e
    data = json.loads(resp_body.decode("utf-8"))
    vector = data["embedding"]["values"]

    observability.get_client().update_current_generation(
        input=text,
        model=settings.EMBEDDING_MODEL,
        metadata={"embedding_dim": len(vector)},
    )
    return vector
