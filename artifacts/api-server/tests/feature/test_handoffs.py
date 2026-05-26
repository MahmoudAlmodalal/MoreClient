import pytest


class TestListHandoffs:
    async def test_empty_list_when_no_handoffs(self, client, auth_headers):
        resp = await client.get("/handoffs", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/handoffs")
        assert resp.status_code == 401


class TestSimulateHandoff:
    async def test_creates_handoff(self, client, auth_headers):
        resp = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web", "message": "Test escalation"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["channel"] == "web"
        assert data["status"] == "pending"
        assert data["is_test"] is True

    async def test_simulated_handoff_appears_in_list(self, client, auth_headers):
        await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web"},
        )
        resp = await client.get("/handoffs", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.post("/handoffs/simulate", json={"channel": "web"})
        assert resp.status_code == 401


class TestResolveHandoff:
    async def test_resolve_changes_status(self, client, auth_headers):
        sim = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web"},
        )
        handoff_id = sim.json()["id"]

        resp = await client.post(
            f"/handoffs/{handoff_id}/resolve",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_resolve_nonexistent_returns_404(self, client, auth_headers):
        resp = await client.post("/handoffs/99999/resolve", headers=auth_headers)
        assert resp.status_code == 404


class TestFeedback:
    async def test_valid_score_accepted(self, client, auth_headers):
        sim = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web"},
        )
        handoff_id = sim.json()["id"]

        resp = await client.post(
            f"/handoffs/{handoff_id}/feedback",
            headers=auth_headers,
            json={"score": 5},
        )
        assert resp.status_code == 200

    async def test_score_out_of_range_returns_400(self, client, auth_headers):
        sim = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web"},
        )
        handoff_id = sim.json()["id"]

        resp = await client.post(
            f"/handoffs/{handoff_id}/feedback",
            headers=auth_headers,
            json={"score": 10},
        )
        assert resp.status_code == 400


class TestBulkDelete:
    async def test_delete_handoffs(self, client, auth_headers):
        sim = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web"},
        )
        handoff_id = sim.json()["id"]

        resp = await client.request(
            "DELETE",
            "/handoffs",
            headers=auth_headers,
            json={"ids": [handoff_id]},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 1

    async def test_delete_empty_ids_returns_zero(self, client, auth_headers):
        resp = await client.request(
            "DELETE",
            "/handoffs",
            headers=auth_headers,
            json={"ids": []},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 0

    async def test_delete_foreign_handoff_returns_403(self, client, auth_headers):
        resp = await client.request(
            "DELETE",
            "/handoffs",
            headers=auth_headers,
            json={"ids": [99999]},
        )
        assert resp.status_code == 403

    async def test_bulk_delete_cleans_up_orphaned_conversations(self, client, auth_headers, db_session):
        # Create two handoffs against the same conversation, then bulk-delete one
        # — the conversation should remain. Delete the second — conversation goes.
        from sqlalchemy import select
        from app.models import Conversation, Handoff

        sim1 = await client.post("/handoffs/simulate", headers=auth_headers, json={"channel": "web"})
        first_id = sim1.json()["id"]

        # Look up the conversation created by the first simulate, then attach a
        # second handoff to it directly.
        result = await db_session.execute(select(Handoff).where(Handoff.id == first_id))
        first_handoff = result.scalar_one()
        conv_id = first_handoff.conversation_id

        second = Handoff(
            tenant_id=first_handoff.tenant_id,
            conversation_id=conv_id,
            channel="web",
            reason="support_request",
            question="another",
            language="en",
        )
        db_session.add(second)
        await db_session.commit()
        second_id = second.id

        # Delete only the first handoff. Conversation must still exist.
        resp = await client.request(
            "DELETE", "/handoffs", headers=auth_headers, json={"ids": [first_id]},
        )
        assert resp.status_code == 200
        result = await db_session.execute(select(Conversation).where(Conversation.id == conv_id))
        assert result.scalar_one_or_none() is not None, "conversation deleted while another handoff still references it"

        # Delete the second handoff. Conversation should now be cleaned up.
        resp = await client.request(
            "DELETE", "/handoffs", headers=auth_headers, json={"ids": [second_id]},
        )
        assert resp.status_code == 200
        db_session.expire_all()
        result = await db_session.execute(select(Conversation).where(Conversation.id == conv_id))
        assert result.scalar_one_or_none() is None, "orphaned conversation was not cleaned up"
