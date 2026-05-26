import re

_ARABIC_RE = re.compile(r"[؀-ۿ]")

_HUMAN_TRIGGERS_EN = [
    "talk to human", "speak to someone", "live agent", "real person",
    "human agent", "customer service", "speak to agent", "talk to agent",
    "connect me", "escalate", "need help from human",
]
_HUMAN_TRIGGERS_AR = [
    "تحدث مع إنسان", "موظف حقيقي", "وكيل بشري", "خدمة العملاء",
    "تحدث مع موظف", "تواصل مع موظف",
]
_COMPLAINT_TRIGGERS_EN = [
    "complain", "complaint", "refund", "angry", "scam", "fraud",
    "terrible", "horrible", "awful", "disgusting", "rip off", "lawsuit",
]
_COMPLAINT_TRIGGERS_AR = [
    "شكوى", "غاضب", "استرداد", "احتيال", "سيء", "مروع",
]


def detect_language(text: str) -> str:
    return "ar" if _ARABIC_RE.search(text) else "en"


def classify_intent(text: str) -> str:
    lower = text.lower()
    for trigger in _HUMAN_TRIGGERS_EN + _HUMAN_TRIGGERS_AR:
        if trigger in lower:
            return "human_request"
    for trigger in _COMPLAINT_TRIGGERS_EN + _COMPLAINT_TRIGGERS_AR:
        if trigger in lower:
            return "complaint"
    return "general"
