"""WhatsApp channel (Twilio). Inbound webhook form -> ChatService -> TwiML.

Twilio delivers inbound messages as form-encoded POSTs and accepts the reply
inline as TwiML in the HTTP response body, so no outbound API call is needed
for a simple request/response bot.
"""

from sqlalchemy.orm import Session

from backend.models.tables import get_or_create_settings
from backend.schemas.chat import ChatResponse
from backend.services.channels.base import Channel, Inbound


def _twiml(body: str) -> str:
    """Build a minimal TwiML <Response><Message> document.

    Uses twilio's MessagingResponse when available, falling back to a hand-built
    string so the app works even if the twilio package is absent.
    """
    try:
        from twilio.twiml.messaging_response import MessagingResponse

        resp = MessagingResponse()
        resp.message(body)
        return str(resp)
    except Exception:
        from xml.sax.saxutils import escape

        return f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>{escape(body)}</Message></Response>"


def empty_twiml() -> str:
    return "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"


class WhatsAppChannel(Channel):
    name = "whatsapp"

    def parse(self, payload: dict, db: Session) -> Inbound | None:
        setting = get_or_create_settings(db)
        if not setting.is_whatsapp_active:
            return None
        body = (payload.get("Body") or "").strip()
        sender = payload.get("From") or ""  # e.g. "whatsapp:+9725..."
        if not body or not sender:
            return None
        return Inbound(session_id=f"wa:{sender}", text=body, meta={"sender": sender})

    def deliver(self, inbound: Inbound, response: ChatResponse, db: Session) -> str:
        return _twiml(response.reply)


def handle_whatsapp_message(form: dict, db: Session) -> str:
    """Backwards-compatible shim. Return a TwiML string for the HTTP response."""
    channel = WhatsAppChannel()
    inbound = channel.parse(form, db)
    if inbound is None:
        return empty_twiml()
    return channel.deliver(inbound, channel.reply(inbound, db), db)
