import pytest
import respx
import httpx

from app.services import embeddings as emb_module
from app.config import settings

_EMB_URL = "https://api.openai.com/v1/embeddings"
_FAKE_VECTOR = [0.1] * 1536


@pytest.fixture(autouse=True)
def _clear_key(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "")


class TestEmbedTexts:
    @respx.mock
    async def test_success_returns_vectors(self, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(_EMB_URL).mock(return_value=httpx.Response(200, json={
            "data": [
                {"index": 0, "embedding": _FAKE_VECTOR},
                {"index": 1, "embedding": [0.2] * 1536},
            ]
        }))
        result = await emb_module.embed_texts(["hello", "world"])
        assert len(result) == 2
        assert result[0] == _FAKE_VECTOR
        assert result[1] == [0.2] * 1536

    async def test_no_api_key_returns_none_list(self):
        result = await emb_module.embed_texts(["hello", "world"])
        assert result == [None, None]

    async def test_empty_input_returns_empty(self):
        result = await emb_module.embed_texts([])
        assert result == []

    @respx.mock
    async def test_api_error_returns_none_list(self, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(_EMB_URL).mock(return_value=httpx.Response(500))
        result = await emb_module.embed_texts(["hello"])
        assert result == [None]


class TestEmbedOne:
    @respx.mock
    async def test_success_returns_vector(self, monkeypatch):
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")
        respx.post(_EMB_URL).mock(return_value=httpx.Response(200, json={
            "data": [{"index": 0, "embedding": _FAKE_VECTOR}]
        }))
        result = await emb_module.embed_one("hello")
        assert result == _FAKE_VECTOR

    async def test_no_api_key_returns_none(self):
        result = await emb_module.embed_one("hello")
        assert result is None
