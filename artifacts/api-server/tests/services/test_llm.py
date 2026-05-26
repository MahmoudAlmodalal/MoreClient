import pytest
import respx
import httpx

from app.services import llm as llm_module
from app.config import settings

_OAI_URL = "https://api.openai.com/v1/chat/completions"
_GEMINI_URL_PREFIX = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

MESSAGES = [{"role": "user", "content": "Hello"}]


@pytest.fixture(autouse=True)
def _clear_api_keys(monkeypatch):
    """Ensure keys start empty; individual tests set what they need."""
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "gemini_api_key", "")


class TestCallOpenAI:
    @respx.mock
    async def test_success(self, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(_OAI_URL).mock(return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": "Hi there!"}}]
        }))
        result = await llm_module._call_openai(MESSAGES)
        assert result == "Hi there!"

    @respx.mock
    async def test_server_error_returns_none(self, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(_OAI_URL).mock(return_value=httpx.Response(500))
        result = await llm_module._call_openai(MESSAGES)
        assert result is None

    async def test_no_api_key_returns_none(self):
        result = await llm_module._call_openai(MESSAGES)
        assert result is None


class TestCallGemini:
    @respx.mock
    async def test_success(self, monkeypatch):
        monkeypatch.setattr(settings, "gemini_api_key", "gem-test")
        respx.post(url__startswith=_GEMINI_URL_PREFIX).mock(
            return_value=httpx.Response(200, json={
                "candidates": [{"content": {"parts": [{"text": "Gemini says hi!"}]}}]
            })
        )
        result = await llm_module._call_gemini(MESSAGES)
        assert result == "Gemini says hi!"

    @respx.mock
    async def test_server_error_returns_none(self, monkeypatch):
        monkeypatch.setattr(settings, "gemini_api_key", "gem-test")
        respx.post(url__startswith=_GEMINI_URL_PREFIX).mock(
            return_value=httpx.Response(429)
        )
        result = await llm_module._call_gemini(MESSAGES)
        assert result is None

    async def test_no_api_key_returns_none(self):
        result = await llm_module._call_gemini(MESSAGES)
        assert result is None


class TestLlmComplete:
    @respx.mock
    async def test_gemini_tried_first(self, monkeypatch):
        monkeypatch.setattr(settings, "gemini_api_key", "gem-test")
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(url__startswith=_GEMINI_URL_PREFIX).mock(
            return_value=httpx.Response(200, json={
                "candidates": [{"content": {"parts": [{"text": "Gemini response"}]}}]
            })
        )
        result = await llm_module.llm_complete(MESSAGES)
        assert result == "Gemini response"

    @respx.mock
    async def test_falls_back_to_openai_when_gemini_fails(self, monkeypatch):
        monkeypatch.setattr(settings, "gemini_api_key", "gem-test")
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(url__startswith=_GEMINI_URL_PREFIX).mock(
            return_value=httpx.Response(500)
        )
        respx.post(_OAI_URL).mock(return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": "OpenAI fallback"}}]
        }))
        result = await llm_module.llm_complete(MESSAGES)
        assert result == "OpenAI fallback"

    async def test_both_missing_returns_none(self):
        result = await llm_module.llm_complete(MESSAGES)
        assert result is None
