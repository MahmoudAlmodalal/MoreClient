"""RAG core — Strategy pattern.

VectorRagStrategy retrieves KB chunks and, if confident, answers with GPT-4o
grounded in them. FallbackStrategy returns an honest "I don't know" + offer of
a human, used when confidence is low, the KB is empty, or the user explicitly
asks for a human.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from backend.core.config import settings as cfg
from backend.services.ai import embeddings, retrieval, vectorstore

# Words that should route straight to a human, in EN + AR.
_ESCALATE_KEYWORDS = ("human", "agent", "representative", "دعم", "بشري", "موظف", "ممثل")

# The model is told to emit this exact token when the context lacks the answer.
_NO_ANSWER_SENTINEL = "__NO_ANSWER__"
_NO_ANSWER_HINTS = (
    "i don't know", "i do not know", "i'm not sure", "cannot find", "can't find",
    "no information", "don't have enough information",
    "لا أعرف", "لا اعرف", "لا تتوفر", "لا يوجد لدي", "لست متأكد", "لا أملك معلومات",
)

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


def _is_no_answer(answer: str) -> bool:
    """True if the model signalled it couldn't ground an answer in the context."""
    if not answer:
        return True
    a = answer.strip().lower()
    if _NO_ANSWER_SENTINEL.lower() in a:
        return True
    # Only short replies that *are* a disclaimer count — don't nuke a real answer
    # that merely mentions uncertainty in passing.
    return len(a) <= 160 and any(h in a for h in _NO_ANSWER_HINTS)


def _call_provider(provider: str, messages: list[dict]) -> str:
    """Run a chat completion against one OpenAI-compatible provider. Raises on failure."""
    from openai import OpenAI

    if provider == "gemini":
        client = OpenAI(
            api_key=cfg.GEMINI_API_KEY, base_url=cfg.GEMINI_BASE_URL, timeout=20.0
        )
        resp = client.chat.completions.create(
            model=cfg.GEMINI_CHAT_MODEL, messages=messages, temperature=0.2
        )
    elif provider == "deepseek":
        client = OpenAI(
            api_key=cfg.NVIDIA_API_KEY, base_url=cfg.NVIDIA_BASE_URL, timeout=60.0
        )
        resp = client.chat.completions.create(
            model=cfg.DEEPSEEK_MODEL,
            messages=messages,
            temperature=0.6,
            top_p=0.95,
            max_tokens=4096,
            extra_body={"chat_template_kwargs": {"thinking": False}},
            stream=False,
        )
    else:  # openai
        client = OpenAI(api_key=cfg.OPENAI_API_KEY, timeout=15.0)
        resp = client.chat.completions.create(
            model=cfg.CHAT_MODEL, messages=messages, temperature=0.2
        )

    return resp.choices[0].message.content.strip()


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
        hits = retrieval.hybrid_search(query, embeddings.embed_query(query), cfg.RETRIEVAL_K)
        if not hits:
            return FallbackStrategy("low_confidence", 0.0).run(query, lang, setting, history)

        # Gate on the best *vector* confidence among candidates, so the documented
        # keyless floor + keyword-escalation behavior is unchanged; hybrid ordering
        # only improves WHICH chunks ground the answer.
        top = max(h.confidence for h in hits)
        if top < _threshold(setting):
            return FallbackStrategy("low_confidence", top).run(query, lang, setting, history)

        context = "\n\n---\n\n".join(h.text for h in hits)
        answer = self._generate(query, lang, setting, context, history or [], user_memory or [])
        sources = [h.text for h in hits]

        # Confidence cleared the bar but the model couldn't ground an answer ->
        # escalate honestly instead of emitting a vague/hallucinated reply.
        if _is_no_answer(answer):
            return RagResult(
                answer=_CANNED.get(lang, _CANNED["en"]),
                confidence=top,
                escalate=True,
                reason="low_confidence",
                sources=sources,
            )
        return RagResult(answer=answer, confidence=top, escalate=False, sources=sources)

    def _generate(self, query, lang, setting, context, history, user_memory=None) -> str:
        # Offline (no provider key): extractive — return the top retrieved chunk verbatim.
        if not cfg.has_any_llm:
            return context.split("\n\n---\n\n")[0].strip()

        tone = getattr(setting, "bot_tone", "professional")
        extra = getattr(setting, "system_prompt_extra", "") or ""
        bot_name = getattr(setting, "bot_name", "the assistant")
        # Long-term memory is context about the *user*, never a grounding source —
        # the bot still answers ONLY from the KB, but may use it to stay relevant.
        if lang == "ar":
            memory_block = ""
            if user_memory:
                joined = "\n- ".join(user_memory)
                memory_block = (
                    f"\n\nما تعرفه مسبقاً عن هذا المستخدم من محادثات سابقة "
                    f"(للسياق فقط، لا تعتبره حقائق تُبنى عليها الإجابة):\n- {joined}"
                )
            system = (
                f"أنت {bot_name}، مساعد دعم عملاء بأسلوب {tone}. "
                f"أجب دائماً باللغة العربية حتى لو ورد في السياق نص بالإنجليزية. {extra}\n\n"
                f"القواعد:\n"
                f"- أجب فقط باستخدام محتوى قاعدة المعرفة الموضّح أدناه ولا تختلق أي معلومة "
                f"أو رقم أو اسم أو رابط أو وسيلة تواصل غير موجودة فيه.\n"
                f"- صُغ إجابتك بأسلوب طبيعي ومباشر ومحادثي.\n"
                f"- استخرج الإجابة المحددة ولا تنسخ النصوص حرفياً مثل عناوين المستندات أو المقدمات أو أرقام الأسئلة.\n"
                f"- لا تذكر أنك تستخدم سياقاً أو دليلاً أو مستنداً.\n"
                f"- إذا لم يحتوِ السياق على إجابة السؤال، أجب بهذا الرمز فقط دون أي نص آخر: "
                f"{_NO_ANSWER_SENTINEL}\n\n"
                f"السياق:\n{context}{memory_block}"
            )
        else:
            memory_block = ""
            if user_memory:
                joined = "\n- ".join(user_memory)
                memory_block = (
                    f"\n\nWhat you already know about this user from past chats "
                    f"(for context only, do not treat as facts to answer from):\n- {joined}"
                )
            system = (
                f"You are {bot_name}, a {tone} customer-support assistant. "
                f"Always respond in English, even if the context contains Arabic text. {extra}\n\n"
                f"RULES:\n"
                f"- Answer ONLY using the knowledge base context below. Never invent facts, "
                f"numbers, names, URLs, or contact details that are not in the context.\n"
                f"- Formulate your answer in a natural, direct conversational way.\n"
                f"- Extract the specific answer and do NOT verbatim copy-paste texts like document titles, intros, or question numbers.\n"
                f"- Do NOT mention that you are using a context, guide, or document.\n"
                f"- If the context does not contain the answer, reply with exactly this token "
                f"and nothing else: {_NO_ANSWER_SENTINEL}\n\n"
                f"Context:\n{context}{memory_block}"
            )
        messages = [{"role": "system", "content": system}]
        for m in history[-cfg.MEMORY_WINDOW:]:
            role = "assistant" if m.get("role") in ("assistant", "agent") else "user"
            messages.append({"role": role, "content": m.get("content", "")})
        messages.append({"role": "user", "content": query})

        # Try each provider in order (Gemini -> DeepSeek -> OpenAI for "auto"); on any
        # failure fall through to the next, and finally to the extractive top chunk so
        # the user always gets a grounded answer rather than an error string.
        for provider in cfg.chat_provider_chain():
            try:
                return _call_provider(provider, messages)
            except Exception:
                continue
        return context.split("\n\n---\n\n")[0].strip()


def resolve_strategy(query: str, setting, kb_empty: bool) -> RagStrategy:
    if _wants_human(query):
        return FallbackStrategy(reason="user_requested", confidence=1.0)
    if kb_empty:
        return FallbackStrategy(reason="low_confidence", confidence=0.0)
    return VectorRagStrategy()
