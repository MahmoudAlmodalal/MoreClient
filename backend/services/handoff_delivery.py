"""Deliver saved human handoff replies back to the original channel."""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from backend.models.tables import Conversation, get_or_create_settings
from backend.services.channels.telegram import send_message as telegram_send_message


@dataclass(frozen=True)
class DeliveryResult:
    ok: bool
    channel: str
    mode: str
    detail: str | None = None

    def to_metadata(self) -> dict:
        payload = {"ok": self.ok, "channel": self.channel, "mode": self.mode}
        if self.detail:
            payload["detail"] = self.detail
        return payload


def deliver_agent_reply(
    conversation: Conversation | None,
    content: str,
    db: Session,
) -> DeliveryResult:
    if conversation is None:
        return DeliveryResult(False, "", "none", "Conversation not found")

    channel = (conversation.channel or "").lower()
    if channel == "telegram":
        return _deliver_telegram(conversation.customer_ref, content, db)
    if channel == "whatsapp":
        return _deliver_whatsapp(conversation.customer_ref, content, db)
    if channel == "web":
        return DeliveryResult(True, "web", "polling")
    return DeliveryResult(False, channel, "unsupported", "Unsupported channel")


def _deliver_telegram(customer_ref: str | None, content: str, db: Session) -> DeliveryResult:
    setting = get_or_create_settings(db)
    if not setting.is_telegram_active or not setting.telegram_token:
        return DeliveryResult(False, "telegram", "bot_api", "Telegram is not active")
    if not customer_ref or not customer_ref.startswith("tg:"):
        return DeliveryResult(False, "telegram", "bot_api", "Missing Telegram chat id")

    try:
        chat_id = int(customer_ref.removeprefix("tg:"))
        telegram_send_message(setting.telegram_token, chat_id, content)
        return DeliveryResult(True, "telegram", "bot_api")
    except Exception as exc:  # noqa: BLE001 - surface best-effort delivery status
        return DeliveryResult(False, "telegram", "bot_api", str(exc))


def _deliver_whatsapp(customer_ref: str | None, content: str, db: Session) -> DeliveryResult:
    setting = get_or_create_settings(db)
    if (
        not setting.is_whatsapp_active
        or not setting.twilio_sid
        or not setting.twilio_token
        or not setting.twilio_number
    ):
        return DeliveryResult(False, "whatsapp", "twilio", "WhatsApp is not active")
    if not customer_ref or not customer_ref.startswith("wa:"):
        return DeliveryResult(False, "whatsapp", "twilio", "Missing WhatsApp recipient")

    to_number = customer_ref.removeprefix("wa:")
    from_number = _normalize_whatsapp_number(setting.twilio_number)

    try:
        from twilio.rest import Client

        message = Client(setting.twilio_sid, setting.twilio_token).messages.create(
            body=content,
            from_=from_number,
            to=to_number,
        )
        return DeliveryResult(True, "whatsapp", "twilio", getattr(message, "sid", None))
    except Exception as exc:  # noqa: BLE001 - surface best-effort delivery status
        return DeliveryResult(False, "whatsapp", "twilio", str(exc))


def _normalize_whatsapp_number(value: str) -> str:
    number = value.strip()
    if number.startswith("whatsapp:"):
        return number
    return f"whatsapp:{number}"
