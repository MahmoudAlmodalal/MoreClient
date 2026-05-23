"""WebSocket chat endpoint for the web widget.

The widget opens one socket per session at /ws/chat/{session_id} and exchanges
messages over it. ChatService is synchronous (sync SQLAlchemy / httpx / OpenAI),
so each turn runs in a threadpool to avoid blocking the event loop, with a fresh
DB session per message rather than holding a connection for the socket's life.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from backend.models.database import SessionLocal
from backend.services.channels.factory import ChannelFactory

router = APIRouter()


@router.websocket("/ws/chat/{session_id}")
async def chat_ws(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    channel = ChannelFactory.get("web")
    try:
        while True:
            raw = await websocket.receive_text()
            inbound = channel.parse(raw, None)  # web parse needs no DB
            if inbound is None:
                continue
            inbound.session_id = session_id

            def _run():
                db = SessionLocal()
                try:
                    response = channel.reply(inbound, db)
                    return channel.deliver(inbound, response, db)
                finally:
                    db.close()

            await websocket.send_json(await run_in_threadpool(_run))
    except WebSocketDisconnect:
        return
