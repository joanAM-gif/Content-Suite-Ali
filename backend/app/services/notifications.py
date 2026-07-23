"""
Notificaciones por email (extra sobre lo pedido en el reto).

Envia un correo cuando cambia el estado de una pieza de contenido
(aprobado/rechazado, Modulo III) o cuando se completa una auditoria de
imagen (Modulo III). La idea es que un Creador se entere de inmediato del
resultado sin tener que entrar a revisar manualmente.

Decisiones de alcance:
- En este demo no existe una tabla de "creadores" con su propio correo:
  los 3 roles son fijos y compartidos entre todo el equipo. Por eso todas
  las notificaciones se mandan a una sola casilla configurable
  (NOTIFY_TO_EMAIL) en vez de a un destinatario dinamico por usuario -- en
  una version de produccion real, este seria el correo de quien creo la
  pieza (requeriria agregar una columna created_by / email a
  content_pieces).
- El envio es "best effort": si SMTP no esta configurado, o el envio
  falla por cualquier motivo (credenciales, red, timeout), se registra el
  error en logs pero NUNCA se propaga la excepcion. Aprobar/rechazar una
  pieza o auditar una imagen debe funcionar aunque el correo no se pueda
  enviar -- la notificacion es un extra, no debe ser un punto de falla
  del flujo principal.
- Si NOTIFY_ENABLED=false (valor por defecto) o faltan credenciales SMTP,
  la funcion simplemente no hace nada; asi el resto del equipo puede
  correr el backend en local sin configurar un servidor de correo.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger("content_suite.notifications")


def _send(subject: str, body: str) -> None:
    if not settings.NOTIFY_ENABLED:
        return

    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD and settings.NOTIFY_TO_EMAIL):
        logger.warning(
            "NOTIFY_ENABLED=true pero faltan variables SMTP_HOST / SMTP_USER / "
            "SMTP_PASSWORD / NOTIFY_TO_EMAIL. Se omite el envio del correo."
        )
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = settings.NOTIFY_TO_EMAIL

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [settings.NOTIFY_TO_EMAIL], msg.as_string())
        logger.info("Notificacion enviada: %s", subject)
    except Exception as exc:  # noqa: BLE001 - un fallo de correo nunca debe romper la API
        logger.error("No se pudo enviar la notificacion por correo (%s): %s", subject, exc)


def notify_review_status(piece_id: int, product: str, status: str, reviewer_note: str | None) -> None:
    """Notifica que una pieza de contenido fue aprobada o rechazada (Modulo III)."""
    estado = "aprobada" if status == "aprobado" else "rechazada"
    subject = f"[Content Suite] Pieza #{piece_id} de '{product}' fue {estado}"
    body = (
        f"La pieza de contenido #{piece_id} para el producto '{product}' fue marcada como {estado.upper()}.\n\n"
        f"Nota del revisor: {reviewer_note or '(sin nota)'}\n\n"
        "Este es un correo automatico de Content Suite. No responder."
    )
    _send(subject, body)


def notify_image_audit(audit_id: int, product: str, cumple: bool, razon: str) -> None:
    """Notifica el veredicto de una auditoria de imagen (Modulo III)."""
    veredicto = "CUMPLE" if cumple else "NO CUMPLE"
    subject = f"[Content Suite] Auditoria de imagen #{audit_id} de '{product}': {veredicto}"
    body = (
        f"La auditoria de imagen #{audit_id} para el producto '{product}' resulto: {veredicto} "
        "con el manual de marca.\n\n"
        f"Razon: {razon}\n\n"
        "Este es un correo automatico de Content Suite. No responder."
    )
    _send(subject, body)