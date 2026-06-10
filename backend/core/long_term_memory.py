"""Long-term memory (task 4.2) — cross-session user profile vectors in ChromaDB.

Short-term memory ([[memory]]) forgets at the session boundary. This module
remembers *across* sessions: each thing a user asks is embedded and stored under
their stable id (the conversation's ``customer_ref`` — a Telegram/WhatsApp chat
id, or the web widget's session_id). On a later turn we recall the topics most
similar to the new question and feed them to RAG as "what we already know about
this user", so the bot can stay contextual between visits.

This is a *separate* Chroma collection from the knowledge base so a user's
private history never leaks into KB retrieval. Every call is best-effort: a
vector-store hiccup must never break the chat path.
"""

import logging

from backend.core.config import settings
from backend.services.ai import embeddings

logger = logging.getLogger(__name__)

_collection = None


def _get_collection():
    """Lazily open the persistent per-user memory collection (cosine space)."""
    global _collection
    if _collection is None:
        import chromadb

        client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
        _collection = client.get_or_create_collection(
            "user_memory", metadata={"hnsw:space": "cosine"}
        )
    return _collection


def remember(user_id: str, text: str) -> None:
    """Embed and store one topic for a user. Id is content-stable so re-asking
    the same thing overwrites rather than piling up duplicates."""
    if not user_id or not text.strip():
        return
    try:
        import hashlib

        digest = hashlib.md5(text.strip().lower().encode("utf-8")).hexdigest()[:16]
        embedding = embeddings.embed_query(text)
        _get_collection().upsert(
            ids=[f"{user_id}:{digest}"],
            documents=[text.strip()],
            embeddings=[embedding],
            metadatas=[{"user_id": user_id}],
        )
    except Exception:
        logger.warning(
            "long-term memory write failed for user %s", user_id, exc_info=True
        )
        pass  # best-effort: never break chat on a memory write


def recall(user_id: str, query: str, k: int = 3) -> list[str]:
    """Return up to k of this user's past topics most similar to ``query``."""
    if not user_id or not query.strip():
        return []
    try:
        col = _get_collection()
        if col.count() == 0:
            return []
        res = col.query(
            query_embeddings=[embeddings.embed_query(query)],
            n_results=k,
            where={"user_id": user_id},
            include=["documents"],
        )
        return [d for d in (res.get("documents") or [[]])[0] if d]
    except Exception:
        logger.warning(
            "long-term memory recall failed for user %s", user_id, exc_info=True
        )
        return []
