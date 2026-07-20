"""
Cliente de Groq Cloud para generacion de texto (Llama 3.x).

Se usa response_format={"type": "json_object"} para forzar salida JSON
valida: es la forma mas confiable de integrar un LLM con un flujo de
datos estructurado sin depender de parseo fragil de texto libre.

Cada llamada queda registrada en Langfuse como una "generation", con el
prompt final enviado como input - la evidencia de "que prompt se envio"
que pide el Modulo IV.
"""
import json

from groq import Groq

from app.config import settings
from app.services.observability import get_client, observe

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY no esta configurada.")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


BRAND_SYSTEM_PROMPT = (
    "Eres un estratega de marca senior. Generas manuales de marca "
    "estructurados, concretos y accionables para equipos de marketing. "
    "Respondes siempre con JSON valido, sin texto adicional fuera del JSON."
)


@observe(name="groq-generate-brand-manual", as_type="generation")
def generate_brand_manual(producto: str, tono: str, publico: str) -> dict:
    """Llama a Groq y devuelve el Manual de Marca Estructurado como dict."""
    user_prompt = f"""
Genera un Manual de Marca Estructurado para el siguiente producto:

- Producto: {producto}
- Tono deseado: {tono}
- Publico objetivo: {publico}

Devuelve EXCLUSIVAMENTE un objeto JSON con esta forma exacta (sin markdown,
sin comentarios, sin texto antes ni despues):

{{
  "tono": "descripcion del tono de marca en 1-2 frases",
  "publico": "descripcion del publico objetivo en 1-2 frases",
  "prohibiciones": ["regla prohibida 1", "regla prohibida 2", "regla prohibida 3"],
  "mensajes_clave": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
  "resumen": "resumen ejecutivo del manual en 2-3 frases"
}}
""".strip()

    completion = _get_client().chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": BRAND_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    manual = json.loads(completion.choices[0].message.content)

    get_client().update_current_generation(
        input=user_prompt,
        output=manual,
        model=settings.GROQ_MODEL,
        usage_details={
            "input": completion.usage.prompt_tokens,
            "output": completion.usage.completion_tokens,
        },
    )
    return manual


def generate_content(content_type: str, product: str, brief: str, brand_context: list[str]) -> str:
    """
    Genera una pieza de contenido (descripcion, guion, prompt de imagen)
    respetando el contexto de marca recuperado del RAG (Modulo II).
    """
    context_block = "\n".join(f"- {chunk}" for chunk in brand_context) or "Sin reglas de marca registradas."

    type_labels = {
        "descripcion": "una descripcion de producto para redes sociales",
        "guion": "un guion de video corto (30-45 segundos)",
        "prompt_imagen": "un prompt detallado para generar una imagen del producto",
    }
    tarea = type_labels.get(content_type, "una pieza de contenido de marketing")

    user_prompt = f"""
Genera {tarea} para el producto "{product}".

Brief del creador: {brief}

Reglas de marca que DEBES respetar estrictamente (recuperadas del manual
de marca via RAG):
{context_block}

Si alguna regla prohibe algo (por ejemplo tecnicismos), no lo uses.
Responde solo con el contenido final, sin explicaciones adicionales.
""".strip()

    return _generate_content_traced(user_prompt, content_type)


@observe(name="groq-generate-content", as_type="generation")
def _generate_content_traced(user_prompt: str, content_type: str) -> str:
    completion = _get_client().chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": "Eres un copywriter que sigue reglas de marca al pie de la letra."},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.6,
    )
    content = completion.choices[0].message.content.strip()

    get_client().update_current_generation(
        input=user_prompt,
        output=content,
        model=settings.GROQ_MODEL,
        metadata={"content_type": content_type},
        usage_details={
            "input": completion.usage.prompt_tokens,
            "output": completion.usage.completion_tokens,
        },
    )
    return content
