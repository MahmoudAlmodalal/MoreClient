"""Customer intent classification for chat routing.

The classifier is intentionally lightweight first: clear bilingual keywords are
handled locally, and the configured LLM is used only for ambiguous messages.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from enum import Enum

from backend.core.config import settings as cfg


class CustomerIntent(str, Enum):
    PURCHASE_INTENT = "purchase_intent"
    SUPPORT_REQUEST = "support_request"
    GENERAL_INQUIRY = "general_inquiry"
    COMPLAINT = "complaint"
    GREETING = "greeting"
    ORDER_STATUS = "order_status"
    SPAM = "spam"


@dataclass
class IntentResult:
    intent: CustomerIntent
    confidence: float
    product_mentioned: str | None = None
    reasoning: str = ""
    source: str = "keyword"


_PURCHASE_PATTERNS = [
    r"\b(i want to buy|i would like to buy|i'd like to buy|i want to order)\b",
    r"\b(place an order|add to cart|checkout|i'?ll take it|i will take it)\b",
    r"\b(buy this|order this|purchase this)\b",
    r"(أريد|اريد|أبغى|ابغى|أبي|ابي|عايز|عاوز)\s+(شراء|اشتري|أشتري|طلب|اطلب|أطلب)",
    r"(أضف|اضف)\s+(للسلة|الى السلة|إلى السلة)",
    r"(بطلب|بشتري|خذ هذا|باخذ هذا|بآخذ هذا)",
]

_SUPPORT_PATTERNS = [
    r"\b(human|agent|representative|support person|customer support)\b",
    r"\b(talk to someone|speak to someone|speak with support)\b",
    r"(موظف|بشري|ممثل|خدمة العملاء|الدعم الفني|اكلم احد|أكلم أحد|تواصلوا معي)",
]

_COMPLAINT_PATTERNS = [
    r"\b(problem|issue|broken|not working|refund|return|exchange|delayed|wrong order|complaint)\b",
    r"(مشكلة|شكوى|لا يعمل|ما يشتغل|معطل|إرجاع|ارجاع|استبدال|تأخر|تاخر|لم يصل|ما وصل|خطأ في الطلب)",
]

_SPAM_PATTERNS = [
    r"\b(crypto|bitcoin|forex|invest|make money|make \$|casino|betting|porn|advertise|marketing)\b",
    r"https?://\S+",  # Link spam
    r"([a-zA-Z0-9])\1{4,}",  # Repeated characters like aaaaaaa
    r"([\u0600-\u06ff])\1{4,}",  # Repeated Arabic characters like ههههههههه
]

_QUESTION_INDICATORS = [
    r"\b(how|what|why|where|when|who|which|whose|whom|can you|is there|do you|policy|how-to)\b",
    r"\?",
    r"(كيف|لماذا|اين|أين|متى|من|هل|بكم|كم|ماذا|ما هو|ماهو|سياسة|طريقة)",
    r"\؟",
]

_ORDER_STATUS_PATTERNS = [
    r"\b(order status|track my order|where is my order|delivery status|shipment)\b",
    r"(حالة الطلب|تتبع الطلب|وين طلبي|أين طلبي|اين طلبي|الشحنة|التوصيل)",
]

_GREETING_PATTERNS = [
    r"^(hi|hello|hey|good morning|good evening)\b",
    r"^(مرحبا|مرحباً|السلام عليكم|اهلا|أهلا|هلا|صباح الخير|مساء الخير)\b",
]

_FOLLOWUP_PURCHASE = (
    "yes",
    "yep",
    "ok",
    "okay",
    "i'll take it",
    "ill take it",
    "i want it",
    "نعم",
    "اي",
    "إي",
    "تمام",
    "موافق",
    "ابغاه",
    "أبغاه",
    "اخذه",
    "آخذه",
)


def classify_intent(
    message: str,
    *,
    history: list[dict] | None = None,
    setting=None,
) -> IntentResult:
    """Classify a customer message into a routing intent."""
    text = message.strip()
    history = history or []

    context_result = _contextual_purchase_followup(text, history)
    if context_result:
        return context_result

    keyword_result = _keyword_scan(text)
    if keyword_result.confidence >= _threshold(setting):
        return keyword_result

    if getattr(setting, "intent_llm_enabled", True) and cfg.has_openai:
        llm_result = _llm_classify(text, history)
        if llm_result:
            return llm_result

    return keyword_result


def _threshold(setting) -> float:
    return getattr(setting, "intent_confidence_threshold", None) or 0.70


def _keyword_scan(message: str) -> IntentResult:
    normalized = _normalize(message)

    checks = [
        (CustomerIntent.SPAM, _SPAM_PATTERNS, 0.95),
        (CustomerIntent.COMPLAINT, _COMPLAINT_PATTERNS, 0.94),
        (CustomerIntent.SUPPORT_REQUEST, _SUPPORT_PATTERNS, 0.94),
        (CustomerIntent.ORDER_STATUS, _ORDER_STATUS_PATTERNS, 0.88),
        (CustomerIntent.PURCHASE_INTENT, _PURCHASE_PATTERNS, 0.90),
        (CustomerIntent.GREETING, _GREETING_PATTERNS, 0.86),
    ]
    for intent, patterns, confidence in checks:
        if any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in patterns):
            if intent == CustomerIntent.COMPLAINT:
                # Check for general question keywords to prevent false positive complaints
                if any(re.search(q_pat, normalized, flags=re.IGNORECASE) for q_pat in _QUESTION_INDICATORS):
                    return IntentResult(
                        intent=CustomerIntent.GENERAL_INQUIRY,
                        confidence=0.50,
                        reasoning="Complaint keywords found but matches question/policy indicator.",
                    )
            return IntentResult(
                intent=intent,
                confidence=confidence,
                product_mentioned=_extract_product_phrase(message) if intent == CustomerIntent.PURCHASE_INTENT else None,
                reasoning=f"Matched {intent.value} keyword pattern.",
            )

    # Price and availability questions are useful sales signals, but not enough
    # to force a structured purchase flow without explicit buying language.
    if re.search(r"\b(how much|price|available|in stock)\b", normalized, re.I) or re.search(
        r"(كم السعر|كم سعر|بكم|متوفر|عندكم|هل يوجد)", normalized
    ):
        return IntentResult(
            intent=CustomerIntent.GENERAL_INQUIRY,
            confidence=0.72,
            product_mentioned=_extract_product_phrase(message),
            reasoning="Price or availability inquiry without explicit purchase request.",
        )

    return IntentResult(
        intent=CustomerIntent.GENERAL_INQUIRY,
        confidence=0.55,
        reasoning="No strong intent keyword matched.",
    )


def _contextual_purchase_followup(message: str, history: list[dict]) -> IntentResult | None:
    normalized = _normalize(message)
    if normalized not in _FOLLOWUP_PURCHASE:
        return None

    recent = " ".join(str(item.get("content", "")) for item in history[-4:]).lower()
    purchase_context = (
        "purchase" in recent
        or "order" in recent
        or "buy" in recent
        or "شراء" in recent
        or "طلب" in recent
        or "كم قطعة" in recent
        or "تؤكد الطلب" in recent
    )
    if not purchase_context:
        return None
    return IntentResult(
        intent=CustomerIntent.PURCHASE_INTENT,
        confidence=0.82,
        reasoning="Short affirmative follow-up in purchase context.",
        source="context",
    )


def _llm_classify(message: str, history: list[dict]) -> IntentResult | None:
    from openai import OpenAI

    history_text = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}" for item in history[-6:]
    )
    prompt = (
        "أنت مصنّف نوايا لخدمة عملاء. صنّف رسالة العميل إلى نوع واحد فقط:\n"
        "- purchase_intent: العميل يريد شراء منتج أو طلبه صراحة\n"
        "- support_request: العميل يطلب التحدث مع موظف أو شخص حقيقي الآن (مثل: 'أريد موظف'، 'كلمني أحد') — لا تستخدم هذا إذا كان يسأل فقط عن طريقة التواصل مع الشركة\n"
        "- complaint: العميل غير راضٍ أو لديه مشكلة أو شكوى\n"
        "- general_inquiry: سؤال عام عن المنتجات أو الخدمات أو طرق التواصل، بما في ذلك السعر بدون طلب شراء واضح\n"
        "- greeting: تحية فقط\n"
        "- order_status: استفسار عن حالة طلب سابق\n"
        "- spam: رسالة عشوائية، إعلانات، محتوى غير لائق، أو نص غير مفهوم / أحرف مكررة\n\n"
        "أمثلة:\n"
        "  'how do I contact you?' → general_inquiry\n"
        "  'كيف أتواصل معكم؟' → general_inquiry\n"
        "  'I want to speak to a human' → support_request\n"
        "  'أريد التحدث مع موظف' → support_request\n\n"
        f"الرسالة: {message}\n"
        f"سياق المحادثة السابقة:\n{history_text or 'لا يوجد'}\n\n"
        'أجب بصيغة JSON فقط: {"intent":"...","confidence":0.0,"product_mentioned":null,"reasoning":"..."}'
    )

    client_kwargs = {"timeout": 12.0}
    if cfg.NVIDIA_API_KEY:
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=cfg.NVIDIA_API_KEY,
            **client_kwargs,
        )
    else:
        client = OpenAI(api_key=cfg.OPENAI_API_KEY, **client_kwargs)

    try:
        resp = client.chat.completions.create(
            model=cfg.CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=300,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(_strip_code_fence(raw))
        intent = CustomerIntent(data.get("intent", CustomerIntent.GENERAL_INQUIRY.value))
        return IntentResult(
            intent=intent,
            confidence=float(data.get("confidence", 0.65)),
            product_mentioned=data.get("product_mentioned"),
            reasoning=data.get("reasoning", "LLM classification."),
            source="llm",
        )
    except Exception:
        return None


def _normalize(message: str) -> str:
    return re.sub(r"\s+", " ", message.strip().lower())


def _extract_product_phrase(message: str) -> str | None:
    cleaned = re.sub(
        r"(أريد|اريد|أبغى|ابغى|أبي|ابي|عايز|عاوز|شراء|اشتري|أشتري|طلب|اطلب|أطلب|i want to buy|i want to order|buy|order|purchase)",
        "",
        message,
        flags=re.IGNORECASE,
    ).strip(" ؟?.,،")
    return cleaned or None


def _strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    return stripped
