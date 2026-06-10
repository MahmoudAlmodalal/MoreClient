"""FastAPI app entrypoint.

Wires CORS for the Next.js frontend, initializes the DB + Chroma collection on
startup, and mounts every feature router. Each router defines its own full
paths (e.g. /api/chat), so includes are prefix-free and stable.
"""

import logging
from contextlib import asynccontextmanager

from backend.core.logging_config import setup_logging

setup_logging()  # structured JSON logging on the root logger

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


def _validate_boot_config() -> None:
    """Fail fast (or warn) on insecure configuration at startup.

    Dev (ENV=dev) stays bootable with zero secrets for the keyless demo; any
    other environment must have APP_SECRET set and must not run admin unguarded.
    """
    origins = settings.ALLOWED_ORIGINS
    if "*" in origins:
        # allow_credentials=True with a wildcard origin is rejected by browsers and
        # is a credential-leak footgun — refuse to start on it.
        raise RuntimeError(
            "ALLOWED_ORIGINS must not contain '*' while credentials are enabled. "
            "List explicit frontend origins instead."
        )
    logger.info("CORS allowed origins: %s", origins)

    if not settings.is_dev:
        if not settings.APP_SECRET:
            raise RuntimeError("APP_SECRET is required when ENV is not 'dev'.")
        if not settings.ADMIN_API_KEY:
            raise RuntimeError("ADMIN_API_KEY is required when ENV is not 'dev'.")
    else:
        if not settings.ADMIN_API_KEY:
            logger.warning(
                "Dev mode: ADMIN_API_KEY unset. Admin routes are %s.",
                "OPEN (ALLOW_INSECURE_ADMIN=1)" if settings.ALLOW_INSECURE_ADMIN else "DENIED",
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_boot_config()
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

# --- Rate limiting (per-IP, in-process) ---
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.core.ratelimit import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex="https?://.*" if settings.is_dev else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Admin-Key", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time-ms"],
)

# Added last so it is the outermost middleware: a correlation id is assigned
# before any other layer runs and is attached to every log line for the request.
from backend.core.logging_config import RequestContextMiddleware

app.add_middleware(RequestContextMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Normalize any unhandled error to a clean problem+json 500 so tracebacks
    never reach the client. FastAPI's HTTPException / validation handlers are
    left intact (they already emit a `detail` body the frontend reads)."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "internal server error"})

from backend.core.security import admin_guard, company_guard
from backend.routers import auth as auth_router

app.include_router(auth_router.router)
app.include_router(admin.router, dependencies=[admin_guard])
app.include_router(chat.router)
app.include_router(files.router, dependencies=[company_guard])
app.include_router(analytics.router, dependencies=[company_guard])
app.include_router(handoffs.router, dependencies=[company_guard])
app.include_router(learn.router, dependencies=[company_guard])
app.include_router(purchases.router, dependencies=[company_guard])
app.include_router(settings_router.router, dependencies=[company_guard])
app.include_router(channels.router)
app.include_router(ws.router)


@app.get("/health")
@limiter.exempt
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
