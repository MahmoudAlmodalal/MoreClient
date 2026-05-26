import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.websocket_manager import WebSocketManager


def _make_ws():
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.close = AsyncMock()
    return ws


class TestDashboardClients:
    async def test_connect_adds_to_pool(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_dashboard(tenant_id=1, ws=ws)
        ws.accept.assert_awaited_once()
        assert ws in mgr.dashboard_clients[1]

    async def test_disconnect_removes_from_pool(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_dashboard(tenant_id=1, ws=ws)
        mgr.disconnect_dashboard(tenant_id=1, ws=ws)
        assert ws not in mgr.dashboard_clients.get(1, set())

    async def test_broadcast_sends_json_to_connected_clients(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_dashboard(tenant_id=1, ws=ws)
        payload = {"type": "handoff.created", "id": 42}
        await mgr.broadcast_dashboard(tenant_id=1, payload=payload)
        ws.send_text.assert_awaited_once_with(json.dumps(payload))

    async def test_broadcast_skips_unknown_tenant(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_dashboard(tenant_id=1, ws=ws)
        await mgr.broadcast_dashboard(tenant_id=99, payload={"x": 1})
        ws.send_text.assert_not_awaited()

    async def test_broadcast_removes_dead_connections(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        ws.send_text.side_effect = Exception("connection closed")
        await mgr.connect_dashboard(tenant_id=1, ws=ws)
        await mgr.broadcast_dashboard(tenant_id=1, payload={"x": 1})
        assert ws not in mgr.dashboard_clients.get(1, set())


class TestChatClients:
    async def test_connect_adds_to_pool(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_chat(session_id="sess-1", ws=ws)
        ws.accept.assert_awaited_once()
        assert ws in mgr.chat_clients["sess-1"]

    async def test_disconnect_removes_from_pool(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_chat(session_id="sess-1", ws=ws)
        mgr.disconnect_chat(session_id="sess-1", ws=ws)
        assert ws not in mgr.chat_clients.get("sess-1", set())

    async def test_broadcast_chat_returns_true_on_delivery(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        await mgr.connect_chat(session_id="sess-1", ws=ws)
        delivered = await mgr.broadcast_chat("sess-1", {"type": "agent_message", "content": "hi"})
        assert delivered is True

    async def test_broadcast_chat_returns_false_when_no_client(self):
        mgr = WebSocketManager()
        delivered = await mgr.broadcast_chat("no-such-session", {"type": "ping"})
        assert delivered is False

    async def test_broadcast_chat_removes_dead_connections(self):
        mgr = WebSocketManager()
        ws = _make_ws()
        ws.send_text.side_effect = Exception("gone")
        await mgr.connect_chat(session_id="sess-1", ws=ws)
        result = await mgr.broadcast_chat("sess-1", {"type": "ping"})
        assert result is False
        assert ws not in mgr.chat_clients.get("sess-1", set())
