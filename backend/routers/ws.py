"""WebSocket chat endpoint for the web widget.

The widget opens one socket per session at /ws/chat/{session_id} and exchanges
messages over it. ChatService is synchronous (sync SQLAlchemy / httpx / OpenAI),
so each turn runs in a threadpool to avoid blocking the event loop, with a fresh
DB session per message rather than holding a connection for the socket's life.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from backend.core.language import detect_language
from backend.models.database import SessionLocal
from backend.services.channels.factory import ChannelFactory

router = APIRouter()

# Bilingual error shown when a turn fails inside _run() (RAG/LLM/DB hiccup), so
# the widget gets a graceful message instead of a dropped socket.
_ERROR_REPLY = {
    "en": "Sorry, something went wrong on our end. Please try again.",
    "ar": "عذراً، حدث خطأ ما لدينا. يرجى المحاولة مرة أخرى.",
}


def _error_payload(lang: str) -> dict:
    """A structured error frame in the same shape WebChannel.deliver returns."""
    return {
        "reply": _ERROR_REPLY.get(lang, _ERROR_REPLY["en"]),
        "sender": "bot",
        "escalate": False,
        "confidence": 0.0,
        "language": lang,
    }


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

            # A failure in _run() must not tear down the socket: send a
            # structured bilingual error instead. send_json stays outside the
            # guard — a drop mid-send raises WebSocketDisconnect (caught below).
            try:
                payload = await run_in_threadpool(_run)
            except Exception:
                payload = _error_payload(detect_language(inbound.text))
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        return
