"""RAG core — Strategy pattern.

VectorRagStrategy retrieves KB chunks and, if confident, answers with GPT-4o
grounded in them. FallbackStrategy returns an honest "I don't know" + offer of
a human, used when confidence is low, the KB is empty, or the user explicitly
asks for a human.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from backend.core.config import settings as cfg
from backend.services.ai import embeddings, vectorstore

# Words that should route straight to a human, in EN + AR.
_ESCALATE_KEYWORDS = ("human", "agent", "representative", "دعم", "بشري", "موظف", "ممثل")

_CANNED = {
    "en": "I don't have enough information to answer that confidently. Would you like to speak with a human support agent?",
    "ar": "عذراً، لا تتوفر لدي معلومات كافية للإجابة على هذا السؤال بثقة. هل تريد التحدث مع موظف دعم بشري؟",
}


@dataclass
class RagResult:
    answer: str
    confidence: float
    escalate: bool
    reason: str | None = None  # low_confidence | user_requested | keyword_triggered
    sources: list[str] = field(default_factory=list)


def _wants_human(query: str) -> bool:
    q = query.lower()
    return any(kw in q for kw in _ESCALATE_KEYWORDS)


def _threshold(setting) -> float:
    return getattr(setting, "confidence_threshold", None) or cfg.CONFIDENCE_THRESHOLD


class RagStrategy(ABC):
    @abstractmethod
    def run(
        self,
        query: str,
        lang: str,
        setting,
        history: list[dict] | None = None,
        user_memory: list[str] | None = None,
    ) -> RagResult: ...


class FallbackStrategy(RagStrategy):
    def __init__(self, reason: str = "low_confidence", confidence: float = 0.0):
        self.reason = reason
        self.confidence = confidence

    def run(self, query, lang, setting, history=None, user_memory=None) -> RagResult:
        return RagResult(
            answer=_CANNED.get(lang, _CANNED["en"]),
            confidence=self.confidence,
            escalate=True,
            reason=self.reason,
        )


class VectorRagStrategy(RagStrategy):
    def run(self, query, lang, setting, history=None, user_memory=None) -> RagResult:
        hits = vectorstore.query(embeddings.embed_query(query), k=cfg.RETRIEVAL_K)
        if not hits:
            return FallbackStrategy("low_confidence", 0.0).run(query, lang, setting, history)

        top = hits[0].confidence
        if top < _threshold(setting):
            return FallbackStrategy("low_confidence", top).run(query, lang, setting, history)

        context = "\n\n---\n\n".join(h.text for h in hits)
        answer = self._generate(query, lang, setting, context, history or [], user_memory or [])
        return RagResult(
            answer=answer,
            confidence=top,
            escalate=False,
            sources=[h.text for h in hits],
        )

    def _generate(self, query, lang, setting, context, history, user_memory=None) -> str:
        # Offline (no key): extractive — return the top retrieved chunk verbatim.
        if not cfg.has_openai:
            return context.split("\n\n---\n\n")[0].strip()

        from openai import OpenAI

        tone = getattr(setting, "bot_tone", "professional")
        extra = getattr(setting, "system_prompt_extra", "") or ""
        bot_name = getattr(setting, "bot_name", "the assistant")
        lang_name = "Arabic" if lang == "ar" else "English"
        # Long-term memory is context about the *user*, never a grounding source —
        # the bot still answers ONLY from the KB, but may use it to stay relevant.
        memory_block = ""
        if user_memory:
            joined = "\n- ".join(user_memory)
            memory_block = (
                f"\n\nWhat you already know about this user from past chats "
                f"(for context only, do not treat as facts to answer from):\n- {joined}"
            )
        system = (
            f"You are {bot_name}, a {tone} customer-support assistant. "
            f"Answer ONLY using the knowledge base context below. If the context "
            f"does not contain the answer, say you don't know. "
            f"Always respond in {lang_name}. {extra}\n\n"
            f"Knowledge base context:\n{context}{memory_block}"
        )
        messages = [{"role": "system", "content": system}]
        for m in history[-cfg.MEMORY_WINDOW:]:
            role = "assistant" if m.get("role") in ("assistant", "agent") else "user"
            messages.append({"role": role, "content": m.get("content", "")})
        messages.append({"role": "user", "content": query})

        client = OpenAI(api_key=cfg.OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=cfg.CHAT_MODEL, messages=messages, temperature=0.2
        )
        return resp.choices[0].message.content.strip()


def resolve_strategy(query: str, setting, kb_empty: bool) -> RagStrategy:
    if _wants_human(query):
        return FallbackStrategy(reason="user_requested", confidence=1.0)
    if kb_empty:
        return FallbackStrategy(reason="low_confidence", confidence=0.0)
    return VectorRagStrategy()
