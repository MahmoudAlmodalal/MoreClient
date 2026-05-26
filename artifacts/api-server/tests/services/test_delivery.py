import pytest
from unittest.mock import AsyncMock
from sqlalchemy import select

from app.models import Tenant, Conversation, Handoff, Settings
from app.services.delivery import deliver_handoff_reply
from app.services import delivery as delivery_module


async def _make_tenant(db_session, *, tenant_key: str = "deliv-tenant") -> Tenant:
    t = Tenant(tenant_key=tenant_key, name="Deliv Co", email=f"{tenant_key}@example.com")
    db_session.add(t)
    await db_session.commit()
    return t


class TestDeliveryConversationMissing:
    async def test_returns_error_when_conversation_missing(self, db_session):
        # Pin bug #2: handoff whose conversation_id points nowhere must fail
        # fast with a descriptive error instead of delivering to "".
        tenant = await _make_tenant(db_session)
        h = Handoff(
            tenant_id=tenant.id,
            conversation_id=99999,
            channel="web",
            language="en",
            status="pending",
            delivery_status="pending",
        )
        db_session.add(h)
        await db_session.commit()

        h_id = h.id
        result = await deliver_handoff_reply(db_session, h_id, "anything")

        assert result["ok"] is False
        assert result["status"] == "error"
        assert "Conversation missing" in result["detail"]

        await db_session.refresh(h)
        assert h.delivery_status == "failed"
        assert h.delivery_detail == "Conversation missing"


class TestDeliveryChannels:
    async def test_telegram_not_configured_returns_error(self, db_session):
        tenant = await _make_tenant(db_session, tenant_key="tg-no-cfg")
        conv = Conversation(tenant_id=tenant.id, customer_ref="chat-1", channel="telegram", language="en")
        db_session.add(conv)
        await db_session.commit()
        h = Handoff(
            tenant_id=tenant.id, conversation_id=conv.id,
            channel="telegram", language="en", status="pending", delivery_status="pending",
        )
        db_session.add(h)
        await db_session.commit()

        result = await deliver_handoff_reply(db_session, h.id, "hi")
        assert result["ok"] is False
        assert "Telegram not configured" in (result["detail"] or "")

    async def test_whatsapp_not_configured_returns_error(self, db_session):
        tenant = await _make_tenant(db_session, tenant_key="wa-no-cfg")
        conv = Conversation(tenant_id=tenant.id, customer_ref="+15551112222", channel="whatsapp", language="en")
        db_session.add(conv)
        await db_session.commit()
        h = Handoff(
            tenant_id=tenant.id, conversation_id=conv.id,
            channel="whatsapp", language="en", status="pending", delivery_status="pending",
        )
        db_session.add(h)
        await db_session.commit()

        result = await deliver_handoff_reply(db_session, h.id, "hi")
        assert result["ok"] is False
        assert "WhatsApp not configured" in (result["detail"] or "")

    async def test_web_broadcasts_via_ws_manager(self, db_session, monkeypatch):
        tenant = await _make_tenant(db_session, tenant_key="web-deliv")
        conv = Conversation(tenant_id=tenant.id, customer_ref="sess-xyz", channel="web", language="en")
        db_session.add(conv)
        await db_session.commit()
        h = Handoff(
            tenant_id=tenant.id, conversation_id=conv.id,
            channel="web", language="en", status="pending", delivery_status="pending",
        )
        db_session.add(h)
        await db_session.commit()

        broadcast = AsyncMock(return_value=True)
        monkeypatch.setattr(delivery_module.ws_manager, "broadcast_chat", broadcast)

        result = await deliver_handoff_reply(db_session, h.id, "agent reply")

        assert result["ok"] is True
        broadcast.assert_awaited_once_with("sess-xyz", {"type": "agent_message", "content": "agent reply"})

        await db_session.refresh(h)
        assert h.delivery_status == "delivered"
