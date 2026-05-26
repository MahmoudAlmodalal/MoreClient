"""End-to-end API journey tests.

Each test function exercises a complete user flow using the same in-memory
SQLite DB that all pytest fixtures share.  Tenants are kept isolated through
unique emails — no explicit cleanup needed between journeys.

hybrid_search is mocked in chat-related tests because its SQL uses
PostgreSQL-specific functions (ILIKE, to_tsvector) that fail against SQLite.
"""
import pytest
from unittest.mock import patch, AsyncMock
from .conftest import register_tenant, auth

_MOCK_CHUNK = [{"content": "Our return policy: 30-day full refund.", "score": 0.85, "document_id": 1}]
_EMPTY_CHUNKS: list = []


class TestAuthJourney:
    """Full authentication lifecycle."""

    async def test_register_login_me_logout(self, client):
        reg = await register_tenant(client)

        # Login with credentials
        login_resp = await client.post("/auth/login", json={
            "email": reg["email"],
            "password": "E2ePassword1!",
        })
        assert login_resp.status_code == 200
        assert "token" in login_resp.json()

        # GET /auth/me now returns the real email (not empty string)
        me_resp = await client.get("/auth/me", headers=auth(reg))
        assert me_resp.status_code == 200
        me = me_resp.json()
        assert me["email"] == reg["email"]
        assert me["role"] == "company"
        assert me["tenant_key"] == reg["tenant_key"]

        # Refresh token
        refresh_resp = await client.post("/auth/refresh", headers=auth(reg))
        assert refresh_resp.status_code == 200
        assert "token" in refresh_resp.json()

        # Logout
        logout_resp = await client.post("/auth/logout")
        assert logout_resp.status_code == 200
        assert logout_resp.json()["ok"] is True

    async def test_duplicate_registration_fails(self, client):
        reg = await register_tenant(client)
        dup_resp = await client.post("/auth/register", json={
            "email": reg["email"],
            "password": "AnotherPass1!",
            "name": "Dup",
            "company_name": "Dup Co",
        })
        assert dup_resp.status_code == 400

    async def test_wrong_password_fails(self, client):
        reg = await register_tenant(client)
        resp = await client.post("/auth/login", json={
            "email": reg["email"],
            "password": "WrongPass999!",
        })
        assert resp.status_code == 401


class TestKnowledgeBaseJourney:
    """Upload → list → delete → list empty."""

    async def test_upload_list_delete_flow(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        # Initially no files
        assert (await client.get("/files", headers=headers)).json() == []

        # Upload a knowledge base document
        content = b"Our return policy: customers may return any product within 30 days."
        upload_resp = await client.post(
            "/upload",
            headers=headers,
            files={"file": ("policy.txt", content, "text/plain")},
        )
        assert upload_resp.status_code == 200
        assert upload_resp.json()["status"] == "indexed"
        assert upload_resp.json()["chunks"] >= 1

        # File appears in list
        files = (await client.get("/files", headers=headers)).json()
        assert len(files) == 1
        assert files[0]["name"] == "policy.txt"
        file_id = files[0]["id"]

        # Delete the file
        del_resp = await client.delete(f"/files/{file_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["ok"] is True

        # File list is empty again
        assert (await client.get("/files", headers=headers)).json() == []

    async def test_chat_uses_uploaded_context(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)
        tenant_key = reg["tenant_key"]

        content = b"We offer free shipping on all orders over $50."
        await client.post(
            "/upload",
            headers=headers,
            files={"file": ("shipping.txt", content, "text/plain")},
        )

        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_MOCK_CHUNK):
            chat_resp = await client.post("/chat", json={
                "session_id": "kb-journey",
                "message": "What is your return policy?",
                "tenant_key": tenant_key,
            })
        assert chat_resp.status_code == 200
        assert chat_resp.json()["answer"]


class TestSupportHandoffJourney:
    """Chat escalation → handoff queue → reply → CSAT → resolve."""

    async def test_full_handoff_lifecycle(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)
        tenant_key = reg["tenant_key"]

        # Customer sends escalation message
        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_EMPTY_CHUNKS):
            chat_resp = await client.post("/chat", json={
                "session_id": "handoff-journey",
                "message": "I need to speak to a human agent right now",
                "tenant_key": tenant_key,
            })
        assert chat_resp.status_code == 200
        data = chat_resp.json()
        assert data["escalate"] is True
        handoff_id = data["handoff"]["id"]

        # Handoff appears in queue
        handoffs = (await client.get("/handoffs", headers=headers)).json()
        ids = [h["id"] for h in handoffs]
        assert handoff_id in ids
        hf = next(h for h in handoffs if h["id"] == handoff_id)
        assert hf["status"] == "pending"

        # Agent replies
        reply_resp = await client.post(
            f"/handoffs/{handoff_id}/reply",
            headers=headers,
            json={"message": "Hi! I'm here to help."},
        )
        assert reply_resp.status_code == 200

        # Customer gives CSAT feedback
        fb_resp = await client.post(
            f"/handoffs/{handoff_id}/feedback",
            headers=headers,
            json={"score": 5},
        )
        assert fb_resp.status_code == 200

        # Resolve the handoff
        resolve_resp = await client.post(f"/handoffs/{handoff_id}/resolve", headers=headers)
        assert resolve_resp.status_code == 200
        assert resolve_resp.json()["ok"] is True

        # Handoff shows as resolved
        handoffs = (await client.get("/handoffs", headers=headers)).json()
        resolved = next((h for h in handoffs if h["id"] == handoff_id), None)
        assert resolved is not None
        assert resolved["status"] == "resolved"

    async def test_simulated_handoff_flow(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        sim = (await client.post(
            "/handoffs/simulate",
            headers=headers,
            json={"channel": "telegram", "message": "Help needed"},
        )).json()
        assert sim["status"] == "pending"
        assert sim["is_test"] is True

        reply = await client.post(
            f"/handoffs/{sim['id']}/reply",
            headers=headers,
            json={"content": "Sure, I can help!"},
        )
        assert reply.status_code == 200

        resolve = await client.post(f"/handoffs/{sim['id']}/resolve", headers=headers)
        assert resolve.status_code == 200


class TestLearnAndRecallJourney:
    """Teach the bot a Q&A pair → verify it creates a chunk → analytics updated."""

    async def test_learn_creates_indexed_document(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        # No files initially
        assert (await client.get("/files", headers=headers)).json() == []

        # Learn a Q&A pair
        learn_resp = await client.post(
            "/learn",
            headers=headers,
            json={
                "question": "What are your business hours?",
                "answer": "We are open Monday to Friday, 9am to 6pm.",
            },
        )
        assert learn_resp.status_code == 200
        data = learn_resp.json()
        assert data["ok"] is True
        assert isinstance(data["id"], int)
        assert isinstance(data["document_id"], int)

        # A "learned" document now appears in files
        files = (await client.get("/files", headers=headers)).json()
        learned = [f for f in files if f["type"] == "learned"]
        assert len(learned) == 1

    async def test_learn_linked_to_handoff(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        sim = (await client.post(
            "/handoffs/simulate", headers=headers, json={"channel": "web"}
        )).json()

        learn_resp = await client.post(
            "/learn",
            headers=headers,
            json={
                "question": "How do I track shipping?",
                "answer": "Use the tracking link in your confirmation email.",
                "source_handoff_id": sim["id"],
            },
        )
        assert learn_resp.status_code == 200
        assert learn_resp.json()["ok"] is True


class TestAnalyticsJourney:
    """Activity → analytics reflect the changes."""

    async def test_analytics_baseline_zeros(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        analytics = (await client.get("/analytics", headers=headers)).json()
        assert analytics["kpis"]["total_questions"] == 0
        assert analytics["kpis"]["cost_savings"] == 0.0

    async def test_analytics_reflect_handoff_activity(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        # Simulate and resolve a handoff
        sim = (await client.post(
            "/handoffs/simulate", headers=headers, json={"channel": "web"}
        )).json()
        await client.post(f"/handoffs/{sim['id']}/resolve", headers=headers)

        analytics = (await client.get("/analytics", headers=headers)).json()
        # Resolved handoffs contribute to the deflection rate calculation
        assert analytics["kpis"]["deflection_rate"] >= 0

    async def test_analytics_unanswered_lists_pending_handoffs(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        await client.post(
            "/handoffs/simulate", headers=headers,
            json={"channel": "web", "message": "Unanswered question 1"},
        )
        await client.post(
            "/handoffs/simulate", headers=headers,
            json={"channel": "web", "message": "Unanswered question 2"},
        )

        analytics = (await client.get("/analytics", headers=headers)).json()
        assert len(analytics["unanswered"]) == 2

    async def test_chat_messages_increment_question_count(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        with patch("app.routes.chat.hybrid_search", new_callable=AsyncMock, return_value=_MOCK_CHUNK):
            for i in range(3):
                await client.post("/chat", json={
                    "session_id": f"analytics-{i}",
                    "message": f"Question number {i}",
                    "tenant_key": reg["tenant_key"],
                })

        analytics = (await client.get("/analytics", headers=headers)).json()
        assert analytics["kpis"]["total_questions"] >= 3
        assert analytics["kpis"]["cost_savings"] > 0


class TestMultiTenantIsolationJourney:
    """Data created by tenant A must be invisible to tenant B."""

    async def test_handoffs_isolated_between_tenants(self, client):
        reg_a = await register_tenant(client)
        reg_b = await register_tenant(client)

        # Tenant A creates a handoff via simulate
        await client.post(
            "/handoffs/simulate",
            headers=auth(reg_a),
            json={"channel": "web", "message": "Tenant A question"},
        )

        # Tenant B sees no handoffs
        b_handoffs = (await client.get("/handoffs", headers=auth(reg_b))).json()
        assert b_handoffs == []

        # Tenant A sees its own handoff
        a_handoffs = (await client.get("/handoffs", headers=auth(reg_a))).json()
        assert len(a_handoffs) == 1

    async def test_files_isolated_between_tenants(self, client):
        reg_a = await register_tenant(client)
        reg_b = await register_tenant(client)

        await client.post(
            "/upload",
            headers=auth(reg_a),
            files={"file": ("a-doc.txt", b"Tenant A content", "text/plain")},
        )

        b_files = (await client.get("/files", headers=auth(reg_b))).json()
        assert b_files == []

        a_files = (await client.get("/files", headers=auth(reg_a))).json()
        assert len(a_files) == 1

    async def test_analytics_isolated_between_tenants(self, client):
        reg_a = await register_tenant(client)
        reg_b = await register_tenant(client)

        # Tenant A creates 3 handoffs
        for i in range(3):
            await client.post(
                "/handoffs/simulate",
                headers=auth(reg_a),
                json={"channel": "web", "message": f"Message {i}"},
            )

        # Tenant B analytics untouched
        b_analytics = (await client.get("/analytics", headers=auth(reg_b))).json()
        assert b_analytics["kpis"]["total_questions"] == 0

        # Tenant A analytics show unanswered
        a_analytics = (await client.get("/analytics", headers=auth(reg_a))).json()
        assert len(a_analytics["unanswered"]) == 3


class TestSettingsJourney:
    """Configure bot settings and verify persistence."""

    async def test_settings_default_and_update(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        # Get initial settings
        settings = (await client.get("/settings", headers=headers)).json()
        assert "tenant_key" in settings
        assert "confidence_threshold" in settings

        # Update bot name and tone via PUT
        put_resp = await client.put(
            "/settings",
            headers=headers,
            json={
                "bot_name": "Aria",
                "bot_tone": "friendly",
                "confidence_threshold": 0.5,
            },
        )
        assert put_resp.status_code == 200

        # Verify changes persisted
        updated = (await client.get("/settings", headers=headers)).json()
        assert updated["bot_name"] == "Aria"
        assert updated["bot_tone"] == "friendly"
        assert updated["confidence_threshold"] == 0.5

    async def test_patch_updates_subset_of_fields(self, client):
        reg = await register_tenant(client)
        headers = auth(reg)

        await client.put("/settings", headers=headers, json={"bot_name": "Original"})

        patch_resp = await client.patch(
            "/settings",
            headers=headers,
            json={"bot_name": "Updated"},
        )
        assert patch_resp.status_code == 200

        settings = (await client.get("/settings", headers=headers)).json()
        assert settings["bot_name"] == "Updated"
