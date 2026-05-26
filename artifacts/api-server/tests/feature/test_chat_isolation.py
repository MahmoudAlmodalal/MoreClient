"""
Regression coverage for /chat/{session_id}/agent-messages multi-tenant
isolation. Two tenants whose conversations share the same customer_ref
must never see each other's messages.
"""
import pytest
from app.models import Tenant, Conversation, Message


async def _seed_tenant_with_agent_message(db_session, *, tenant_key: str, content: str) -> tuple[Tenant, Conversation]:
    t = Tenant(tenant_key=tenant_key, name=tenant_key, email=f"{tenant_key}@x.com")
    db_session.add(t)
    await db_session.commit()
    conv = Conversation(tenant_id=t.id, customer_ref="shared-ref", channel="web", language="en")
    db_session.add(conv)
    await db_session.commit()
    db_session.add(Message(conversation_id=conv.id, role="agent", content=content))
    await db_session.commit()
    return t, conv


class TestAgentMessagesIsolation:
    async def test_agent_messages_filtered_by_tenant_key(self, client, db_session):
        t_a, _ = await _seed_tenant_with_agent_message(db_session, tenant_key="alpha", content="from-alpha")
        t_b, _ = await _seed_tenant_with_agent_message(db_session, tenant_key="bravo", content="from-bravo")

        resp = await client.get(
            "/chat/shared-ref/agent-messages",
            params={"tenant_key": t_a.tenant_key},
        )
        assert resp.status_code == 200
        bodies = [m["content"] for m in resp.json()]
        assert bodies == ["from-alpha"]
        assert "from-bravo" not in bodies

        resp = await client.get(
            "/chat/shared-ref/agent-messages",
            params={"tenant_key": t_b.tenant_key},
        )
        assert resp.status_code == 200
        bodies = [m["content"] for m in resp.json()]
        assert bodies == ["from-bravo"]

    async def test_unknown_tenant_key_returns_404(self, client):
        resp = await client.get(
            "/chat/whatever/agent-messages",
            params={"tenant_key": "no-such-tenant"},
        )
        assert resp.status_code == 404

    async def test_returns_empty_list_when_no_conversation_for_tenant(self, client, db_session):
        t = Tenant(tenant_key="lonely", name="Lonely", email="lonely@x.com")
        db_session.add(t)
        await db_session.commit()
        resp = await client.get(
            "/chat/no-conv/agent-messages",
            params={"tenant_key": "lonely"},
        )
        assert resp.status_code == 200
        assert resp.json() == []
