"""Web channel — the widget surface behind the /ws/chat/{session_id} socket.

Inbound frames arrive as raw WebSocket text: either plain text or a small JSON
envelope like {"message": "..."}. The reply is returned as a JSON-serializable
dict that the socket handler sends straight back. `session_id` is supplied by
the route (from the URL path), so parse() leaves it blank.
"""

import json
from typing import Any

from sqlalchemy.orm import Session

from backend.schemas.chat import ChatResponse
from backend.services.channels.base import Channel, Inbound


def _extract_text(payload: str) -> str:
    """Accept either a JSON envelope {"message": "..."} or a plain text frame."""
    try:
        data = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return payload if isinstance(payload, str) else ""
    if isinstance(data, dict):
        return str(data.get("message") or data.get("text") or "")
    return str(data)


class WebChannel(Channel):
    name = "web"

    def parse(self, payload: str, db: Session | None = None) -> Inbound | None:
        text = _extract_text(payload)
        if not text.strip():
            return None
        # session_id is assigned by the WebSocket route from the URL path.
        return Inbound(session_id="", text=text)

    def deliver(self, inbound: Inbound, response: ChatResponse, db: Session) -> dict[str, Any]:
        return {
            "reply": response.reply,
            "sender": response.sender,
            "escalate": response.escalate,
            "confidence": response.confidence,
            "language": response.language,
        }
