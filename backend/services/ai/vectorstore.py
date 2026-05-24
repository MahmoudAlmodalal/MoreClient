"""Persistent ChromaDB wrapper. SQL Document.id is the join key; chunk ids are
deterministic ("doc-{id}-{i}" / "learned-{id}") so we can delete-by-document
without storing chunk ids in SQL.

Embedding-dimension safety: providers emit different vector sizes (Gemini 3072,
OpenAI 1536, hash = EMBED_DIM), and a Chroma collection fixes its dimension at
the first insert. We record the active embedding signature in a sidecar file and
raise a clear, actionable error if a later read/write uses a different dimension
— instead of letting Chroma fail every retrieval with a cryptic 500. Switching
providers requires a re-seed (see reset_collection / seed_demo).

Writes invalidate the hybrid retrieval index (lazy import to avoid a cycle).
"""

import json
import os
from dataclasses import dataclass

import chromadb

from backend.core.config import settings

_collection = None
_SIG_FILE = "embedding_signature.json"


def get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
        # cosine space -> distances in [0, 2]; confidence = 1 - distance/2.
        _collection = client.get_or_create_collection(
            "knowledge_base", metadata={"hnsw:space": "cosine"}
        )
    return _collection


# --- embedding-dimension guard ---------------------------------------------

def _sig_path() -> str:
    return os.path.join(settings.CHROMA_DIR, _SIG_FILE)


def embedding_signature() -> dict | None:
    """The {provider, dim} the store was populated with, or None if unknown."""
    try:
        with open(_sig_path(), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _write_signature(dim: int) -> None:
    try:
        os.makedirs(settings.CHROMA_DIR, exist_ok=True)
        with open(_sig_path(), "w", encoding="utf-8") as fh:
            json.dump({"provider": settings.embed_provider, "dim": dim}, fh)
    except OSError:
        pass  # best-effort; the guard degrades to no-op without a sidecar


def _mismatch_error(stored: dict, current_dim: int) -> RuntimeError:
    return RuntimeError(
        f"Embedding dimension mismatch: the Chroma store at {settings.CHROMA_DIR} "
        f"holds {stored.get('dim')}-dim vectors from provider "
        f"'{stored.get('provider')}', but the active provider "
        f"'{settings.embed_provider}' produces {current_dim}-dim vectors. "
        f"Re-seed the store (py -X utf8 -m backend.scripts.seed_demo) or call "
        f"vectorstore.reset_collection() before switching embedding providers."
    )


def _guard_write(dim: int) -> None:
    """Record the signature on first write; raise on a later dimension change."""
    if get_collection().count() == 0:
        _write_signature(dim)
        return
    sig = embedding_signature()
    if sig is None:
        _write_signature(dim)  # backfill for pre-existing stores
    elif sig.get("dim") not in (None, dim):
        raise _mismatch_error(sig, dim)


def _guard_read(dim: int) -> None:
    sig = embedding_signature()
    if sig is not None and sig.get("dim") not in (None, dim):
        raise _mismatch_error(sig, dim)


def reset_collection() -> None:
    """Drop the collection + signature so a re-seed can rebuild from scratch."""
    global _collection
    client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
    try:
        client.delete_collection("knowledge_base")
    except Exception:
        pass
    _collection = None
    try:
        os.remove(_sig_path())
    except OSError:
        pass
    _invalidate_index()


def _invalidate_index() -> None:
    """Drop the cached hybrid lexical index after a write (lazy import = no cycle)."""
    try:
        from backend.services.ai import retrieval

        retrieval.invalidate()
    except Exception:
        pass


@dataclass
class Hit:
    text: str
    distance: float
    metadata: dict
    id: str = ""

    @property
    def confidence(self) -> float:
        # cosine distance in [0, 2] -> similarity in [0, 1]
        return max(0.0, 1.0 - self.distance / 2.0)


def add_document_chunks(document_id: int, chunks: list[str], embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    _guard_write(len(embeddings[0]))
    ids = [f"doc-{document_id}-{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": document_id, "kind": "document", "chunk_index": i}
        for i in range(len(chunks))
    ]
    get_collection().add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)
    _invalidate_index()


def add_learned(learned_id: int, question: str, answer: str, embedding: list[float]) -> None:
    _guard_write(len(embedding))
    get_collection().add(
        ids=[f"learned-{learned_id}"],
        documents=[f"{question}\n{answer}"],
        embeddings=[embedding],
        metadatas=[{"kind": "learned", "learned_id": learned_id}],
    )
    _invalidate_index()


def delete_document(document_id: int) -> None:
    get_collection().delete(where={"document_id": document_id})
    _invalidate_index()


def all_chunks() -> list[tuple]:
    """Every chunk as (id, text, metadata, embedding) — used to build the BM25 index."""
    col = get_collection()
    if col.count() == 0:
        return []
    res = col.get(include=["documents", "metadatas", "embeddings"])
    ids = res.get("ids") or []
    docs = res.get("documents") or []
    metas = res.get("metadatas") or []
    embs = res.get("embeddings")
    if embs is None:
        embs = [None] * len(ids)
    out = []
    for i in range(len(ids)):
        emb = embs[i] if i < len(embs) else None
        out.append((ids[i], docs[i], metas[i] or {}, emb))
    return out


def query(embedding: list[float], k: int = 4) -> list[Hit]:
    if is_empty():
        return []
    _guard_read(len(embedding))
    res = get_collection().query(
        query_embeddings=[embedding],
        n_results=k,
        include=["documents", "distances", "metadatas"],
    )
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    return [
        Hit(text=d, distance=dist, metadata=m or {}, id=i)
        for i, d, dist, m in zip(ids, docs, dists, metas)
    ]


def is_empty() -> bool:
    return get_collection().count() == 0
