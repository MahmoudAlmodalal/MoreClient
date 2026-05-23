"""FastAPI app entrypoint.

Wires CORS for the Next.js frontend, initializes the DB + Chroma collection on
startup, and mounts every feature router. Each router defines its own full
paths (e.g. /api/chat), so includes are prefix-free and stable.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.models.database import init_db
from backend.routers import (
    analytics,
    channels,
    chat,
    files,
    handoffs,
    learn,
    settings as settings_router,
    ws,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates the SQLite file + all tables on startup
    # Warm the persistent Chroma collection so the first request isn't slow.
    from backend.services.ai import vectorstore

    vectorstore.get_collection()
    yield


app = FastAPI(title="AI Support Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(files.router)
app.include_router(analytics.router)
app.include_router(handoffs.router)
app.include_router(learn.router)
app.include_router(settings_router.router)
app.include_router(channels.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
