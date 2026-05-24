"""Telegram channel. Inbound Update -> ChatService -> reply via Bot API.

We send via the raw HTTP Bot API (httpx) rather than python-telegram-bot's
async Application, keeping this path synchronous and dependency-light. The bot
token comes from the Setting row, so it is configurable from the dashboard.
"""

import httpx
from sqlalchemy.orm import Session

from backend.core.config import settings as cfg
from backend.core import crypto
from backend.models.tables import get_or_create_settings
from backend.schemas.chat import ChatResponse
from backend.services.channels.base import Channel, Inbound


def _parse(update: dict) -> tuple[int | None, str, str]:
    """Return (chat_id, text, username) from a Telegram Update payload."""
    msg = update.get("message") or update.get("edited_message") or {}
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    text = msg.get("text") or ""
    frm = msg.get("from") or {}
    username = frm.get("username") or frm.get("first_name") or str(chat_id or "")
    return chat_id, text, username


def send_message(token: str, chat_id: int, text: str) -> None:
    response = httpx.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text},
        timeout=15,
    )
    response.raise_for_status()


class TelegramChannel(Channel):
    name = "telegram"

    def parse(self, payload: dict, db: Session) -> Inbound | None:
        setting = get_or_create_settings(db)
        if not setting.is_telegram_active or not setting.telegram_token:
            return None
        chat_id, text, username = _parse(payload)
        if not chat_id or not text:
            return None
        return Inbound(
            session_id=f"tg:{chat_id}",
            text=text,
            meta={
                "chat_id": chat_id,
                "token": crypto.decrypt(setting.telegram_token),
                "username": username,
                "tenant_key": cfg.DEFAULT_TENANT_KEY,
            },
        )

    def deliver(self, inbound: Inbound, response: ChatResponse, db: Session) -> None:
        send_message(inbound.meta["token"], inbound.meta["chat_id"], response.reply)


def handle_telegram_update(payload: dict, db: Session) -> None:
    """Backwards-compatible shim around TelegramChannel for any direct callers."""
    channel = TelegramChannel()
    inbound = channel.parse(payload, db)
    if inbound is None:
        return
    channel.deliver(inbound, channel.reply(inbound, db), db)
