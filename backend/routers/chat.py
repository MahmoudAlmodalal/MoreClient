"""POST /api/chat — owned by Phase B agent B1.

Thin HTTP layer: parse the ChatRequest body, delegate to the ChatService
brain (which persists, runs RAG, and commits internally), and return the
fully-populated ChatResponse. Follows the route-handler contract: re-raise
HTTPExceptions untouched, normalize anything unexpected to a 500.
"""

import time

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import Conversation, Message
from backend.core.config import settings as cfg
from backend.schemas.chat import ChatMessageOut, ChatRequest, ChatResponse
from backend.services.chat_service import ChatService
from backend.services.realtime import broadcast_dashboard_snapshot

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
def post_chat(
    payload: ChatRequest, response: Response, db: Session = Depends(get_db)
) -> ChatResponse:
    start = time.perf_counter()
    try:
        result = ChatService(db).handle(
            session_id=payload.session_id,
            message=payload.message,
            channel=payload.channel,
            tenant_key=payload.tenant_key,
        )
        # Expose server-side latency so the perf gate (and any client) can read it
        # without changing the ChatResponse schema. Demo target: < 3000 ms.
        response.headers["X-Response-Time-ms"] = f"{(time.perf_counter() - start) * 1000:.1f}"
        broadcast_dashboard_snapshot("chat.message")
        return result
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — normalize unknowns to a clean 500
        raise HTTPException(status_code=500, detail="chat failed") from exc


@router.get("/api/chat/{session_id}/agent-messages", response_model=list[ChatMessageOut])
def list_agent_messages(
    session_id: str,
    channel: str = "web",
    after_id: int = 0,
    tenant_key: str | None = None,
    db: Session = Depends(get_db),
) -> list[ChatMessageOut]:
    tenant = (tenant_key or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY
    conversation = db.scalars(
        select(Conversation)
        .where(
            Conversation.customer_ref == session_id,
            Conversation.channel == channel,
            Conversation.tenant_key == tenant,
        )
        .order_by(Conversation.id.desc())
    ).first()
    if conversation is None:
        return []

    rows = db.scalars(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.role == "agent",
            Message.id > after_id,
        )
        .order_by(Message.id.asc())
    ).all()
    return [
        ChatMessageOut(
            id=row.id,
            role=row.role,
            content=row.content,
            time=row.created_at.strftime("%H:%M") if row.created_at else "",
        )
        for row in rows
    ]
