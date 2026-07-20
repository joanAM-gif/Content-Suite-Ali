"""
Modulo IV: Observabilidad con Langfuse.

Punto unico de import para el resto del backend. Se re-exportan:

- `observe`: decorador que envuelve una funcion en un span/trace de
  Langfuse (basado en OpenTelemetry), capturando automaticamente
  duracion, inputs y outputs.
- `get_client`: da acceso al cliente activo para enriquecer el span en
  curso con metadata explicita (contexto recuperado del RAG, prompt
  final enviado, etc), tal como pide el reto.

Diseno importante: si LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY no estan
configuradas, el SDK de Langfuse se "desactiva" solo (loguea un warning
y no envia trazas) en vez de lanzar una excepcion. Esto significa que
Modulos I, II y III siguen funcionando exactamente igual con o sin
Langfuse configurado - la observabilidad es un add-on, no una dependencia
dura del negocio.
"""
from langfuse import get_client, observe

__all__ = ["observe", "get_client"]
