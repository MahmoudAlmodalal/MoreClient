"""Channel contract shared by every inbound surface.

The three surfaces have different I/O shapes — Telegram sends its reply via an
outbound Bot API call, WhatsApp returns TwiML inline in the HTTP response, and
the web widget speaks over a bidirectional WebSocket. The contract splits the
flow into three steps so each channel overrides only what differs:

  parse()    raw payload  -> normalized Inbound (or None to ignore)
  reply()    Inbound      -> ChatResponse        (shared brain, same for all)
  deliver()  ChatResponse -> transport-specific output (send / TwiML / dict)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from backend.schemas.chat import ChatResponse
from backend.services.chat_service import ChatService


@dataclass
class Inbound:
    """A normalized inbound message, channel-agnostic.

    `session_id` keys the conversation (e.g. "tg:123", "wa:whatsapp:+9725...",
    or a widget UUID). `meta` carries channel-specific bits needed to deliver
    the reply (chat_id + token for Telegram, sender for WhatsApp, ...).
    """

    session_id: str
    text: str
    meta: dict[str, Any] = field(default_factory=dict)


class Channel(ABC):
    name: str  # "telegram" | "whatsapp" | "web" — passed through to ChatService

    @abstractmethod
    def parse(self, payload: Any, db: Session) -> Inbound | None:
        """Normalize a raw inbound payload. Return None to ignore the event
        (channel inactive, blank message, unsupported update type)."""

    def reply(self, inbound: Inbound, db: Session) -> ChatResponse:
        """Run the shared brain — identical for every channel."""
        return ChatService(db).handle(
            session_id=inbound.session_id, message=inbound.text, channel=self.name
        )

    @abstractmethod
    def deliver(self, inbound: Inbound, response: ChatResponse, db: Session) -> Any:
        """Transport the reply in this channel's form: Telegram sends via the
        Bot API (returns None); WhatsApp returns a TwiML string; web returns a
        JSON-serializable dict for the socket to send."""
