"""Short-term memory (task 4.1) — a process-local cache of the last N messages
per session, sitting *in front of* the durable Message table.

Why both this and the DB? The DB (Conversation/Message) is the source of truth
and survives restarts; this cache spares the chat hot-path a SQL round-trip on
every turn. On a cache miss (cold process, evicted entry) the caller primes the
ring buffer from the DB via ``prime``; thereafter ``remember`` keeps it warm.

Keys are opaque strings. ChatService keys by ``"{channel}:{session_id}"`` so the
same session_id on two channels stays isolated, but the public surface is
``get_context(session_id)`` per the spec.
"""

from collections import deque
from threading import Lock

from backend.core.config import settings

# session_key -> deque[{"role", "content"}], newest last, bounded to MEMORY_WINDOW.
_store: dict[str, deque] = {}
_lock = Lock()


def _bucket(session_id: str) -> deque:
    """Return (creating if needed) the bounded ring buffer for a session."""
    dq = _store.get(session_id)
    if dq is None:
        dq = deque(maxlen=settings.MEMORY_WINDOW)
        _store[session_id] = dq
    return dq


def get_context(session_id: str, n: int | None = None) -> list[dict]:
    """Recent turns for a session, oldest first. Empty list on a cold cache."""
    with _lock:
        dq = _store.get(session_id)
        if not dq:
            return []
        items = list(dq)
    return items[-n:] if n else items


def remember(session_id: str, role: str, content: str) -> None:
    """Append one turn; the deque's maxlen evicts the oldest automatically."""
    with _lock:
        _bucket(session_id).append({"role": role, "content": content})


def prime(session_id: str, messages: list[dict]) -> None:
    """Seed the cache from the DB on a miss. No-op if already warm so we never
    clobber fresher in-memory turns with a stale DB snapshot."""
    with _lock:
        if _store.get(session_id):
            return
        dq = _bucket(session_id)
        for m in messages[-settings.MEMORY_WINDOW:]:
            dq.append({"role": m.get("role"), "content": m.get("content", "")})


def clear(session_id: str) -> None:
    """Drop a session's cache (e.g. when its conversation is closed)."""
    with _lock:
        _store.pop(session_id, None)
