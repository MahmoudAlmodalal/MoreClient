import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from app.auth import decode_jwt
from app.websocket_manager import ws_manager
from app.routes import health, auth, settings, files, chat, handoffs, learn, analytics, admin, webhooks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MoreClient API server starting up")
    yield
    logger.info("MoreClient API server shutting down")


app = FastAPI(title="MoreClient API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Webhook routes (no /api prefix)
app.include_router(webhooks.router)

# API routes
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(settings.router)
app.include_router(files.router)
app.include_router(chat.router)
app.include_router(handoffs.router)
app.include_router(learn.router)
app.include_router(analytics.router)
app.include_router(admin.router)


# WebSocket: dashboard (requires JWT)
@app.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket, token: str = Query("")):
    payload = decode_jwt(token) if token else None
    if not payload:
        await websocket.close(code=1008)
        return

    tenant_id = payload["tid"]
    await ws_manager.connect_dashboard(tenant_id, websocket)
    try:
        # Keep-alive: ping every 30s
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_text('{"type":"ping"}')
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect_dashboard(tenant_id, websocket)


# WebSocket: chat widget (no auth)
@app.websocket("/ws/chat/{session_id}")
async def ws_chat(websocket: WebSocket, session_id: str):
    await ws_manager.connect_chat(session_id, websocket)
    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_text('{"type":"ping"}')
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect_chat(session_id, websocket)


if __name__ == "__main__":
    import uvicorn
    from app.config import settings as cfg
    uvicorn.run("main:app", host="0.0.0.0", port=cfg.port, reload=False)
