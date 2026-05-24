"""In-memory realtime fanout for dashboard analytics snapshots."""

import asyncio
import logging
import threading
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

from backend.models.database import SessionLocal
from backend.services.analytics import get_analytics_snapshot

logger = logging.getLogger(__name__)


@dataclass(eq=False)
class DashboardClient:
    websocket: WebSocket
    loop: asyncio.AbstractEventLoop
    lock: asyncio.Lock


class DashboardConnectionManager:
    def __init__(self) -> None:
        self._clients: list[DashboardClient] = []
        self._lock = threading.Lock()

    def add(self, websocket: WebSocket) -> DashboardClient:
        client = DashboardClient(
            websocket=websocket,
            loop=asyncio.get_running_loop(),
            lock=asyncio.Lock(),
        )
        with self._lock:
            self._clients.append(client)
        return client

    def remove(self, client: DashboardClient) -> None:
        with self._lock:
            self._clients = [item for item in self._clients if item is not client]

    def has_clients(self) -> bool:
        with self._lock:
            return bool(self._clients)

    async def send_to_client(
        self,
        client: DashboardClient,
        payload: dict[str, Any],
    ) -> None:
        try:
            async with client.lock:
                await client.websocket.send_json(payload)
        except Exception:
            self.remove(client)

    def broadcast(self, payload: dict[str, Any]) -> None:
        with self._lock:
            clients = list(self._clients)

        for client in clients:
            if client.loop.is_closed():
                self.remove(client)
                continue
            future = asyncio.run_coroutine_threadsafe(
                self.send_to_client(client, payload),
                client.loop,
            )
            future.add_done_callback(self._log_send_error)

    @staticmethod
    def _log_send_error(future) -> None:
        try:
            future.exception()
        except Exception:
            logger.exception("Failed to send dashboard analytics snapshot")


dashboard_connections = DashboardConnectionManager()


def build_dashboard_snapshot_message(reason: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        snapshot = get_analytics_snapshot(db)
        return {
            "type": "analytics.snapshot",
            "reason": reason,
            "data": snapshot.model_dump(),
        }
    finally:
        db.close()


def broadcast_dashboard_snapshot(reason: str) -> None:
    """Best-effort broadcast; route handlers should never fail because of it."""
    if not dashboard_connections.has_clients():
        return
    try:
        dashboard_connections.broadcast(build_dashboard_snapshot_message(reason))
    except Exception:
        logger.exception("Failed to broadcast dashboard analytics snapshot")
