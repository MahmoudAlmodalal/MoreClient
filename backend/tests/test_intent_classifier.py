from backend.services.intent_classifier import CustomerIntent, classify_intent


class DummySetting:
    intent_llm_enabled = False
    intent_confidence_threshold = 0.7


def test_detects_arabic_purchase_intent():
    result = classify_intent("أريد شراء عطر المسك", setting=DummySetting())
    assert result.intent == CustomerIntent.PURCHASE_INTENT
    assert result.product_mentioned == "عطر المسك"


def test_detects_english_purchase_intent():
    result = classify_intent("I want to buy the white musk perfume", setting=DummySetting())
    assert result.intent == CustomerIntent.PURCHASE_INTENT


def test_price_question_stays_general_inquiry():
    result = classify_intent("كم سعر المنتج؟", setting=DummySetting())
    assert result.intent == CustomerIntent.GENERAL_INQUIRY


def test_detects_complaint():
    result = classify_intent("عندي مشكلة في الطلب", setting=DummySetting())
    assert result.intent == CustomerIntent.COMPLAINT


def test_detects_support_request():
    result = classify_intent("تكلم مع موظف", setting=DummySetting())
    assert result.intent == CustomerIntent.SUPPORT_REQUEST


def test_contextual_purchase_followup():
    result = classify_intent(
        "نعم",
        history=[{"role": "assistant", "content": "هل تريد شراء هذا المنتج؟"}],
        setting=DummySetting(),
    )
    assert result.intent == CustomerIntent.PURCHASE_INTENT
