"""
Auditoria multimodal de imagenes contra el manual de marca (Modulo III).

Usa Gemini 2.5 Flash (Google AI Studio, free tier) para comparar una
imagen contra las reglas de marca recuperadas en texto del RAG, y
devuelve un veredicto estructurado: {"cumple": bool, "razon": str}.

Nota de alcance: se audita la imagen contra el TEXTO del manual (no
contra una imagen de referencia), como se documenta en el README.

Esta funcion es la que el reto pide instrumentar explicitamente en el
Modulo IV ("cuanto tiempo tomo la auditoria multimodal"): al estar
decorada con @observe, Langfuse registra automaticamente el timestamp
de inicio y fin del span, sin necesidad de medir el tiempo a mano.
"""
import base64
import json
from importlib import import_module
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.config import settings

try:
    observe = import_module("langfuse").observe
except ModuleNotFoundError:
    # Langfuse is optional for local execution and static analysis.
    def observe(*_args, **_kwargs):
        def decorator(function):
            return function

        return decorator

_VISION_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{settings.VISION_MODEL}:generateContent"
)

_AUDIT_PROMPT_TEMPLATE = """
Eres un auditor de cumplimiento de marca. Compara la imagen adjunta
contra las siguientes reglas del manual de marca del producto "{product}":

{brand_rules}

Evalua si la imagen CUMPLE con esas reglas (tono visual, elementos
mencionados explicitamente, coherencia con el publico y mensajes clave).
Responde EXCLUSIVAMENTE con un JSON con esta forma exacta, sin texto
adicional antes ni despues:

{{
  "cumple": true o false,
  "razon": "explicacion concreta y breve de por que cumple o por que falla"
}}
""".strip()


def _get_langfuse_client():
    """Load Langfuse lazily so static analysis does not require the package."""
    return import_module("langfuse").get_client()


def _call_gemini_with_retry(payload: dict, attempts: int = 2) -> dict:
    """
    Llama a Gemini y parsea su respuesta como JSON. Gemini en modo JSON
    ocasionalmente devuelve texto mal formado (comillas sin escapar,
    respuesta truncada), aunque se le pida `response_mime_type:
    application/json`. En vez de fallar la auditoria completa por un
    error puntual de formato, se reintenta una vez mas antes de
    propagar el error.
    """
    last_error: Exception | None = None
    for _ in range(attempts):
        request = Request(
            f"{_VISION_URL}?key={settings.GOOGLE_API_KEY}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                data = json.loads(response.read())
        except HTTPError as exc:
            raise RuntimeError(
                f"Error de Gemini ({exc.code}): {exc.read().decode(errors='replace')}"
            ) from exc
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
    raise last_error  # type: ignore[misc]

@observe(name="gemini-multimodal-audit", as_type="generation")
def audit_image(product: str, brand_rules: list[str], image_bytes: bytes, mime_type: str) -> dict:
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY no esta configurada.")

    rules_block = "\n".join(f"- {rule}" for rule in brand_rules) or "Sin reglas de marca registradas."
    prompt = _AUDIT_PROMPT_TEMPLATE.format(product=product, brand_rules=rules_block)

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode(),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"response_mime_type": "application/json"},
    }

    verdict = _call_gemini_with_retry(payload)

    _get_langfuse_client().update_current_generation(
        input=prompt,
        output=verdict,
        model=settings.VISION_MODEL,
        metadata={
            "product": product,
            "mime_type": mime_type,
            "image_size_bytes": len(image_bytes),
            "brand_rules_used": len(brand_rules),
        },
    )
    return verdict
