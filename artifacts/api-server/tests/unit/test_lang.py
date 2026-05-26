from app.services.lang import detect_language, classify_intent


class TestDetectLanguage:
    def test_english_text(self):
        assert detect_language("Hello, how can I help you?") == "en"

    def test_arabic_text(self):
        assert detect_language("مرحبا كيف حالك") == "ar"

    def test_mixed_text_with_arabic_chars(self):
        assert detect_language("Hello مرحبا world") == "ar"

    def test_empty_string_defaults_to_en(self):
        assert detect_language("") == "en"

    def test_numbers_only_defaults_to_en(self):
        assert detect_language("12345") == "en"


class TestClassifyIntent:
    def test_generic_question_is_general(self):
        assert classify_intent("What are your business hours?") == "general"

    def test_human_request_english(self):
        assert classify_intent("I want to talk to human agent please") == "human_request"

    def test_human_request_escalate(self):
        assert classify_intent("Please escalate my issue") == "human_request"

    def test_human_request_live_agent(self):
        assert classify_intent("Can I speak to a live agent?") == "human_request"

    def test_human_request_arabic(self):
        assert classify_intent("أريد التحدث مع موظف حقيقي") == "human_request"

    def test_complaint_english(self):
        assert classify_intent("I want to file a complaint about this") == "complaint"

    def test_complaint_refund(self):
        assert classify_intent("I need a refund, this is terrible") == "complaint"

    def test_complaint_arabic(self):
        assert classify_intent("لدي شكوى بخصوص الخدمة") == "complaint"

    def test_case_insensitive(self):
        assert classify_intent("TALK TO HUMAN please") == "human_request"

    def test_human_request_takes_priority_order(self):
        # human_request triggers appear before complaint triggers in the check
        result = classify_intent("I want to connect me and also complain")
        assert result == "human_request"
