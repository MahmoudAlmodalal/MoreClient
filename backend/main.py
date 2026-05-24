"""FastAPI app entrypoint.

Wires CORS for the Next.js frontend, initializes the DB + Chroma collection on
startup, and mounts every feature router. Each router defines its own full
paths (e.g. /api/chat), so includes are prefix-free and stable.
"""

import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.core.config import settings
from backend.models.database import SessionLocal, init_db

logger = logging.getLogger(__name__)
from backend.routers import (
    admin,
    analytics,
    channels,
    chat,
    files,
    handoffs,
    learn,
    purchases,
    settings as settings_router,
    ws,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates the SQLite file + all tables on startup
    # Warm the persistent Chroma collection so the first request isn't slow.
    from backend.services.ai import vectorstore

    vectorstore.get_collection()

    # Start Telegram long-polling if the channel is active.
    from backend.services.channels import telegram_poller

    telegram_poller.ensure_running_if_active()

    yield

    # Cleanly stop the poller on shutdown.
    telegram_poller.stop()


app = FastAPI(title="AI Support Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Normalize any unhandled error to a clean problem+json 500 so tracebacks
    never reach the client. FastAPI's HTTPException / validation handlers are
    left intact (they already emit a `detail` body the frontend reads)."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "internal server error"})

app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(files.router)
app.include_router(analytics.router)
app.include_router(handoffs.router)
app.include_router(learn.router)
app.include_router(purchases.router)
app.include_router(settings_router.router)
app.include_router(channels.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    """Lightweight liveness probe — always 200 so it stays usable as a probe.
    Reports DB reachability without raising. (Deep metrics live in /api/admin/health.)"""
    db_status = "ok"
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.warning("Health check DB ping failed", exc_info=True)
        db_status = "error"
    finally:
        db.close()
    return {"status": "ok", "db": db_status}
