"""Tests for the /chat endpoint.

hybrid_search is mocked throughout because its SQL uses PostgreSQL-specific
functions (ILIKE, to_tsvector) that fail against the SQLite test DB.
"""
import pytest
from unittest.mock import patch, AsyncMock


_MOCK_CHUNK = [{"content": "We offer 30-day returns.", "score": 0.9, "document_id": 1}]
_EMPTY_CHUNKS: list = []


class TestChatMissingTenantKey:
    async def test_missing_tenant_key_returns_400(self, client):
        resp = await client.post("/chat", json={
            "session_id": "s1",
            "message": "Hello",
        })
        assert resp.status_code == 400

    async def test_unknown_tenant_key_returns_404(self, client):
        resp = await client.post("/chat", json={
            "session_id": "s1",
            "message": "Hello",
            "tenant_key": "this-key-does-not-exist",
        })
        assert resp.status_code == 404


class TestChatWithContext:
    """Tests that require the retrieval service to be mocked."""

    async def test_valid_request_returns_response_fields(self, client, registered_user):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_MOCK_CHUNK):
            resp = await client.post("/chat", json={
                "session_id": "chat-session-1",
                "message": "What is your return policy?",
                "tenant_key": registered_user["tenant_key"],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert "confidence" in data
        assert "escalate" in data
        assert "language" in data
        assert "sender" in data
        assert "handoff" in data
        assert data["language"] == "en"

    async def test_human_request_triggers_escalation(self, client, registered_user):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_EMPTY_CHUNKS):
            resp = await client.post("/chat", json={
                "session_id": "escalation-session",
                "message": "I need to speak to a human agent please",
                "tenant_key": registered_user["tenant_key"],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["escalate"] is True
        assert data["handoff"] is not None
        assert isinstance(data["handoff"]["id"], int)

    async def test_arabic_input_detected(self, client, registered_user):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_EMPTY_CHUNKS):
            resp = await client.post("/chat", json={
                "session_id": "arabic-session",
                "message": "مرحبا، كيف يمكنك مساعدتي؟",
                "tenant_key": registered_user["tenant_key"],
            })
        assert resp.status_code == 200
        assert resp.json()["language"] == "ar"

    async def test_camelcase_tenant_key_alias_works(self, client, registered_user):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_EMPTY_CHUNKS):
            resp = await client.post("/chat", json={
                "session_id": "alias-session",
                "message": "I need a human agent",
                "tenantKey": registered_user["tenant_key"],
            })
        assert resp.status_code == 200

    async def test_same_session_continues_conversation(self, client, registered_user):
        payload = {"session_id": "continuous", "tenant_key": registered_user["tenant_key"]}
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_MOCK_CHUNK):
            r1 = await client.post("/chat", json={**payload, "message": "First message"})
            r2 = await client.post("/chat", json={**payload, "message": "Second message"})
        assert r1.status_code == 200
        assert r2.status_code == 200

    async def test_escalated_handoff_appears_in_handoffs_list(self, client, registered_user, auth_headers):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_EMPTY_CHUNKS):
            await client.post("/chat", json={
                "session_id": "handoff-check",
                "message": "I need a human agent",
                "tenant_key": registered_user["tenant_key"],
            })
        handoffs = (await client.get("/handoffs", headers=auth_headers)).json()
        assert len(handoffs) >= 1
        assert handoffs[0]["status"] == "pending"

    async def test_high_confidence_response_not_escalated(self, client, registered_user):
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_MOCK_CHUNK):
            resp = await client.post("/chat", json={
                "session_id": "high-conf",
                "message": "What is your return policy?",
                "tenant_key": registered_user["tenant_key"],
            })
        assert resp.status_code == 200
        assert resp.json()["escalate"] is False
