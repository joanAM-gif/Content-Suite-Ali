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

import httpx

from app.config import settings
from app.services.observability import get_client, observe

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

    response = httpx.post(
        _VISION_URL,
        params={"key": settings.GOOGLE_API_KEY},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    verdict = json.loads(text)

    get_client().update_current_generation(
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
