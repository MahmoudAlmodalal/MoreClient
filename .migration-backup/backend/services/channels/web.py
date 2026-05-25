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


def _extract_payload(payload: str) -> tuple[str, str | None]:
    """Accept either a JSON envelope {"message": "..."} or a plain text frame."""
    try:
        data = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return (payload if isinstance(payload, str) else "", None)
    if isinstance(data, dict):
        text = str(data.get("message") or data.get("text") or "")
        tenant_key = data.get("tenantKey") or data.get("tenant_key")
        return text, str(tenant_key) if tenant_key else None
    return str(data), None


class WebChannel(Channel):
    name = "web"

    def parse(self, payload: str, db: Session | None = None) -> Inbound | None:
        text, tenant_key = _extract_payload(payload)
        if not text.strip():
            return None
        # session_id is assigned by the WebSocket route from the URL path.
        meta = {"tenant_key": tenant_key} if tenant_key else {}
        return Inbound(session_id="", text=text, meta=meta)

    def deliver(self, inbound: Inbound, response: ChatResponse, db: Session) -> dict[str, Any]:
        return {
            "reply": response.reply,
            "sender": response.sender,
            "escalate": response.escalate,
            "confidence": response.confidence,
            "language": response.language,
        }
