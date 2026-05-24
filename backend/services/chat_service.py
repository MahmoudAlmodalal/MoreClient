"""ChatService — the single brain used by the web route and both channel
webhooks. Persists the conversation, pulls short-term memory, runs RAG, and
opens a Handoff when the bot escalates.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session
import re

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
from backend.services.ai import knowledge_sync, rag, vectorstore
from backend.services.intent_classifier import CustomerIntent, classify_intent
from backend.services.purchase_flow import advance_purchase_flow, get_active_purchase_order
from backend.services.realtime import broadcast_handoff_created


class ChatService:
    def __init__(self, db: Session):
        self.db = db

    def handle(
        self,
        *,
        session_id: str,
        message: str,
        channel: str = "web",
        tenant_key: str | None = None,
    ) -> ChatResponse:
        """Public entry. Rolls the session back on any failure so a half-written
        turn never lingers on a pooled connection, then re-raises for the caller
        (the router normalizes it to a clean 500)."""
        try:
            return self._handle(
                session_id=session_id,
                message=message,
                channel=channel,
                tenant_key=tenant_key,
            )
        except Exception:
            try:
                self.db.rollback()
            except Exception:  # pragma: no cover — rollback best-effort
                pass
            raise

    def _handle(
        self,
        *,
        session_id: str,
        message: str,
        channel: str = "web",
        tenant_key: str | None = None,
    ) -> ChatResponse:
        tenant = self._tenant_key(tenant_key)
        setting = get_or_create_settings(self.db)
        conv = self._get_or_create_conversation(session_id, channel, tenant)

        lang = detect_language(message)

        # Short-term memory: read the warm cache *before* recording this turn, so
        # `history` holds only prior turns (the current message is the query). On a
        # cold cache, prime from the DB (which doesn't yet hold this message).
        mem_key = f"{tenant}:{channel}:{session_id}"
        history = memory.get_context(mem_key)
        if not history:
            memory.prime(mem_key, self._recent_messages(conv, n=cfg.MEMORY_WINDOW))
            history = memory.get_context(mem_key)

        self._add_message(conv, role="user", content=message)

        if self._is_greeting(message):
            answer = self._greeting_reply(lang)
            self._add_message(conv, role="assistant", content=answer)
            self._remember_turn(mem_key, session_id, message, answer)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=answer,
                sender="bot",
                escalate=False,
                confidence=1.0,
                language=lang,
            )

        if self._is_unsafe_or_instruction_attack(message):
            conv.status = "handoff"
            self._ensure_handoff(conv, reason="unsafe_or_unanswered", question=message)
            answer = self._unanswered_handoff_reply(lang)
            self._add_message(conv, role="assistant", content=answer)
            self._remember_turn(mem_key, session_id, message, answer)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=answer,
                sender="bot",
                escalate=True,
                confidence=0.0,
                language=lang,
            )

        if conv.status == "handoff":
            answer = self._handoff_waiting_reply(lang)
            self._add_message(conv, role="assistant", content=answer)
            self._remember_turn(mem_key, session_id, message, answer)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=answer,
                sender="bot",
                escalate=True,
                confidence=1.0,
                language=lang,
            )

        active_purchase = get_active_purchase_order(self.db, conv)
        if active_purchase is not None:
            flow = advance_purchase_flow(self.db, conv, message, setting)
            self._add_message(conv, role="assistant", content=flow.reply)
            self._remember_turn(mem_key, session_id, message, flow.reply)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=flow.reply,
                sender="bot",
                escalate=flow.escalated,
                confidence=flow.confidence,
                language=lang,
            )

        intent = classify_intent(message, history=history, setting=setting)
        if intent.intent == CustomerIntent.SPAM:
            reply = (
                "تم حظر الرسالة للاشتباه في محتوى عشوائي."
                if lang == "ar"
                else "Message blocked: potential spam detected."
            )
            self._add_message(conv, role="assistant", content=reply)
            self.db.commit()
            return ChatResponse(
                reply=reply,
                sender="bot",
                escalate=False,
                confidence=intent.confidence,
                language=lang,
            )

        if (
            intent.intent == CustomerIntent.PURCHASE_INTENT
            and getattr(setting, "purchase_flow_enabled", True)
        ):
            flow = advance_purchase_flow(self.db, conv, message, setting, intent)
            self._add_message(conv, role="assistant", content=flow.reply)
            self._remember_turn(mem_key, session_id, message, flow.reply)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=flow.reply,
                sender="bot",
                escalate=flow.escalated,
                confidence=flow.confidence,
                language=lang,
            )

        if (
            intent.source != "llm"
            and (
                intent.intent == CustomerIntent.SUPPORT_REQUEST
                or (
                    intent.intent == CustomerIntent.COMPLAINT
                    and getattr(setting, "auto_handoff_on_complaint", True)
                )
            )
        ):
            reason = "complaint" if intent.intent == CustomerIntent.COMPLAINT else "support_request"
            conv.status = "handoff"
            self._ensure_handoff(conv, reason=reason, question=message)
            answer = self._handoff_started_reply(lang, reason)
            self._add_message(conv, role="assistant", content=answer)
            self._remember_turn(mem_key, session_id, message, answer)
            setting.used_messages = (setting.used_messages or 0) + 1
            self.db.commit()
            return ChatResponse(
                reply=answer,
                sender="bot",
                escalate=True,
                confidence=intent.confidence,
                language=lang,
            )

        # Long-term memory: recall what we know about this user across sessions.
        user_memory = long_term_memory.recall(session_id, message)

        try:
            knowledge_sync.ensure_tenant_documents_indexed(self.db, tenant)
        except Exception:
            # Retrieval will fall back normally if vector repair cannot run.
            pass

        strategy = rag.resolve_strategy(
            message,
            setting,
            kb_empty=vectorstore.is_empty(tenant),
            tenant_key=tenant,
        )
        result = strategy.run(message, lang, setting, history, user_memory)

        if result.escalate:
            conv.status = "handoff"
            self._ensure_handoff(conv, reason=result.reason or "low_confidence", question=message)

        self._add_message(conv, role="assistant", content=result.answer)

        # Best-effort: a memory write must never propagate and roll back the
        # already-added assistant message before the commit below.
        try:
            self._remember_turn(mem_key, session_id, message, result.answer)
        except Exception:
            pass

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

    def _get_or_create_conversation(
        self,
        session_id: str,
        channel: str,
        tenant_key: str,
    ) -> Conversation:
        stmt = (
            select(Conversation)
            .where(
                Conversation.customer_ref == session_id,
                Conversation.channel == channel,
                Conversation.tenant_key == tenant_key,
                Conversation.status != "closed",
            )
            .order_by(Conversation.id.desc())
        )
        conv = self.db.scalars(stmt).first()
        if conv is None:
            conv = Conversation(
                channel=channel,
                tenant_key=tenant_key,
                customer_ref=session_id,
                status="open",
            )
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

    def _ensure_handoff(self, conv: Conversation, *, reason: str, question: str = "") -> None:
        existing = self.db.scalars(
            select(Handoff).where(
                Handoff.conversation_id == conv.id,
                Handoff.status == "pending",
            )
        ).first()
        if existing is None:
            handoff = Handoff(conversation_id=conv.id, reason=reason, status="pending")
            self.db.add(handoff)
            # Commit immediately so a decided escalation is durable even if a
            # later side-effect raises before handle()'s final commit.
            self.db.commit()
            self.db.refresh(handoff)
            broadcast_handoff_created({
                "id": handoff.id,
                "conversationId": conv.id,
                "channel": conv.channel,
                "reason": reason,
                "question": question[:200],
                "createdAt": handoff.created_at.isoformat() if handoff.created_at else None,
            })
        else:
            existing.reason = reason

    def _remember_turn(self, mem_key: str, session_id: str, message: str, answer: str) -> None:
        memory.remember(mem_key, "user", message)
        memory.remember(mem_key, "assistant", answer)
        long_term_memory.remember(session_id, message)

    def _handoff_started_reply(self, lang: str, reason: str) -> str:
        if lang == "ar":
            if reason in ("low_confidence", "unsafe_or_unanswered"):
                return self._unanswered_handoff_reply(lang)
            if reason == "complaint":
                return "أفهمك، تم تحويل المحادثة لفريق الدعم لمراجعة المشكلة والرد عليك قريباً."
            return "تم تحويلك إلى موظف دعم. سيرد عليك فريقنا قريباً."
        if reason in ("low_confidence", "unsafe_or_unanswered"):
            return self._unanswered_handoff_reply(lang)
        if reason == "complaint":
            return "I understand. I’ve forwarded this to our support team so they can review the issue and reply shortly."
        return "I’ve connected you with a support agent. Our team will reply shortly."

    def _handoff_waiting_reply(self, lang: str) -> str:
        if lang == "ar":
            return "المحادثة حالياً مع فريق الدعم، وسيتم الرد عليك قريباً."
        return "This conversation is already with our support team. They’ll reply shortly."

    def _unanswered_handoff_reply(self, lang: str) -> str:
        if lang == "ar":
            return "تم تحويل سؤالك إلى فريق الدعم، وسيتم الرد عليك قريباً."
        return "I’ve forwarded your question to our support team. They’ll reply shortly."

    def _greeting_reply(self, lang: str) -> str:
        if lang == "ar":
            return "مرحباً! كيف أقدر أساعدك اليوم؟"
        return "Hello! How can I help you today?"

    def _tenant_key(self, value: str | None) -> str:
        return (value or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY

    def _is_greeting(self, message: str) -> bool:
        normalized = re.sub(r"\s+", " ", message.strip().lower())
        return bool(
            re.fullmatch(
                r"(hi|hello|hey|good morning|good evening|مرحبا|مرحباً|السلام عليكم|اهلا|أهلا|هلا|صباح الخير|مساء الخير)",
                normalized,
                flags=re.IGNORECASE,
            )
        )

    def _is_unsafe_or_instruction_attack(self, message: str) -> bool:
        normalized = re.sub(r"\s+", " ", message.strip().lower())
        patterns = (
            r"\b(ignore|disregard|forget|bypass)\b.*\b(instruction|instructions|rules|system|developer)\b",
            r"\b(system prompt|developer message|hidden instruction|secret prompt)\b",
            r"(تجاهل|انسى|اكسر|تجاوز).{0,40}(تعليمات|قواعد|النظام|السيستم)",
            r"(اعطني|أعطني|اكشف|اظهر|أظهر).{0,40}(التعليمات|البرومبت|prompt|system)",
            r"(انا|أنا).{0,20}(مالكك|صاحبك|مديرك).{0,60}(تجاهل|اكشف|اعطني|أعطني)",
        )
        return any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in patterns)
