import asyncio
import json
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.dashboard_clients: dict[int, set[WebSocket]] = {}
        self.chat_clients: dict[str, set[WebSocket]] = {}

    async def connect_dashboard(self, tenant_id: int, ws: WebSocket):
        await ws.accept()
        self.dashboard_clients.setdefault(tenant_id, set()).add(ws)

    def disconnect_dashboard(self, tenant_id: int, ws: WebSocket):
        clients = self.dashboard_clients.get(tenant_id, set())
        clients.discard(ws)

    async def connect_chat(self, session_id: str, ws: WebSocket):
        await ws.accept()
        self.chat_clients.setdefault(session_id, set()).add(ws)

    def disconnect_chat(self, session_id: str, ws: WebSocket):
        clients = self.chat_clients.get(session_id, set())
        clients.discard(ws)

    async def broadcast_dashboard(self, tenant_id: int, payload: dict):
        dead = set()
        for ws in self.dashboard_clients.get(tenant_id, set()):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect_dashboard(tenant_id, ws)

    async def broadcast_chat(self, session_id: str, payload: dict) -> bool:
        clients = self.chat_clients.get(session_id, set())
        if not clients:
            return False
        dead = set()
        delivered = False
        for ws in clients:
            try:
                await ws.send_text(json.dumps(payload))
                delivered = True
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect_chat(session_id, ws)
        return delivered


ws_manager = WebSocketManager()
