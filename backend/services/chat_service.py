"""ChatService — the single brain used by the web route and both channel
webhooks. Persists the conversation, pulls short-term memory, runs RAG, and
opens a Handoff when the bot escalates.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core import long_term_memory, memory
from backend.core.config import settings as cfg
from backend.core.language import detect_language
from backend.models.tables import (
    Conversation,
    Handoff,
    Message,
    get_or_create_settings,
)
from backend.schemas.chat import ChatResponse
from backend.services.ai import rag, vectorstore


class ChatService:
    def __init__(self, db: Session):
        self.db = db

    def handle(self, *, session_id: str, message: str, channel: str = "web") -> ChatResponse:
        setting = get_or_create_settings(self.db)
        conv = self._get_or_create_conversation(session_id, channel)

        lang = detect_language(message)

        # Short-term memory: read the warm cache *before* recording this turn, so
        # `history` holds only prior turns (the current message is the query). On a
        # cold cache, prime from the DB (which doesn't yet hold this message).
        mem_key = f"{channel}:{session_id}"
        history = memory.get_context(mem_key)
        if not history:
            memory.prime(mem_key, self._recent_messages(conv, n=cfg.MEMORY_WINDOW))
            history = memory.get_context(mem_key)

        self._add_message(conv, role="user", content=message)

        # Long-term memory: recall what we know about this user across sessions.
        user_memory = long_term_memory.recall(session_id, message)

        strategy = rag.resolve_strategy(message, setting, kb_empty=vectorstore.is_empty())
        result = strategy.run(message, lang, setting, history, user_memory)

        if result.escalate:
            conv.status = "handoff"
            self._ensure_handoff(conv, reason=result.reason or "low_confidence")

        self._add_message(conv, role="assistant", content=result.answer)

        # Keep the short-term cache warm with this turn (user + bot reply).
        memory.remember(mem_key, "user", message)
        memory.remember(mem_key, "assistant", result.answer)
        # Persist the user's question as a cross-session topic for next time.
        long_term_memory.remember(session_id, message)

        # Track usage for the dashboard meter.
        setting.used_messages = (setting.used_messages or 0) + 1

        self.db.commit()
        return ChatResponse(
            reply=result.answer,
            sender="bot",
            escalate=result.escalate,
            confidence=round(result.confidence, 4),
            language=lang,
        )

    # --- helpers ---------------------------------------------------------

    def _get_or_create_conversation(self, session_id: str, channel: str) -> Conversation:
        stmt = (
            select(Conversation)
            .where(
                Conversation.customer_ref == session_id,
                Conversation.channel == channel,
                Conversation.status != "closed",
            )
            .order_by(Conversation.id.desc())
        )
        conv = self.db.scalars(stmt).first()
        if conv is None:
            conv = Conversation(channel=channel, customer_ref=session_id, status="open")
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
        return conv

    def _add_message(self, conv: Conversation, *, role: str, content: str) -> Message:
        msg = Message(conversation_id=conv.id, role=role, content=content)
        self.db.add(msg)
        return msg

    def _recent_messages(self, conv: Conversation, n: int) -> list[dict]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.id.desc())
            .limit(n)
        )
        rows = list(self.db.scalars(stmt))
        rows.reverse()
        return [{"role": m.role, "content": m.content} for m in rows]

    def _ensure_handoff(self, conv: Conversation, *, reason: str) -> None:
        existing = self.db.scalars(
            select(Handoff).where(
                Handoff.conversation_id == conv.id,
                Handoff.status == "pending",
            )
        ).first()
        if existing is None:
            self.db.add(Handoff(conversation_id=conv.id, reason=reason, status="pending"))
