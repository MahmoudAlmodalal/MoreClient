"""Persistent ChromaDB wrapper. SQL Document.id is the join key; chunk ids are
deterministic ("doc-{id}-{i}" / "learned-{id}") so we can delete-by-document
without storing chunk ids in SQL.
"""

from dataclasses import dataclass

import chromadb

from backend.core.config import settings

_collection = None


def _tenant_key(value: str | None) -> str:
    return (value or settings.DEFAULT_TENANT_KEY).strip().lower() or settings.DEFAULT_TENANT_KEY


def get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
        # cosine space -> distances in [0, 2]; confidence = 1 - distance/2.
        _collection = client.get_or_create_collection(
            "knowledge_base", metadata={"hnsw:space": "cosine"}
        )
    return _collection


@dataclass
class Hit:
    text: str
    distance: float
    metadata: dict

    @property
    def confidence(self) -> float:
        # cosine distance in [0, 2] -> similarity in [0, 1]
        return max(0.0, 1.0 - self.distance / 2.0)


def add_document_chunks(
    document_id: int,
    chunks: list[str],
    embeddings: list[list[float]],
    tenant_key: str | None = None,
) -> None:
    if not chunks:
        return
    tenant = _tenant_key(tenant_key)
    ids = [f"doc-{document_id}-{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "document_id": document_id,
            "kind": "document",
            "chunk_index": i,
            "tenant_key": tenant,
        }
        for i in range(len(chunks))
    ]
    get_collection().add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)


def add_learned(
    learned_id: int,
    question: str,
    answer: str,
    embedding: list[float],
    tenant_key: str | None = None,
) -> None:
    tenant = _tenant_key(tenant_key)
    get_collection().add(
        ids=[f"learned-{learned_id}"],
        documents=[f"{question}\n{answer}"],
        embeddings=[embedding],
        metadatas=[{"kind": "learned", "learned_id": learned_id, "tenant_key": tenant}],
    )


def delete_document(document_id: int) -> None:
    get_collection().delete(where={"document_id": document_id})


def _query_raw(embedding: list[float], k: int, tenant_key: str | None) -> list[Hit]:
    where = {"tenant_key": _tenant_key(tenant_key)} if tenant_key else None
    kwargs = {
        "query_embeddings": [embedding],
        "n_results": k,
        "include": ["documents", "distances", "metadatas"],
    }
    if where:
        kwargs["where"] = where
    res = get_collection().query(**kwargs)
    docs = (res.get("documents") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    return [Hit(text=d, distance=dist, metadata=m or {}) for d, dist, m in zip(docs, dists, metas)]


def query(embedding: list[float], k: int = 4, tenant_key: str | None = None) -> list[Hit]:
    if is_empty(tenant_key):
        return []
    hits = _query_raw(embedding, k, tenant_key)
    if hits or _tenant_key(tenant_key) != _tenant_key(settings.DEFAULT_TENANT_KEY):
        return hits
    # Existing local Chroma stores may contain chunks created before tenant metadata.
    # Treat those legacy chunks as belonging to the default tenant only.
    return [
        hit
        for hit in _query_raw(embedding, k, None)
        if not hit.metadata.get("tenant_key")
    ]


def is_empty(tenant_key: str | None = None) -> bool:
    if tenant_key is None:
        return get_collection().count() == 0
    tenant = _tenant_key(tenant_key)
    result = get_collection().get(where={"tenant_key": tenant}, limit=1)
    if result.get("ids"):
        return False
    if tenant != _tenant_key(settings.DEFAULT_TENANT_KEY):
        return True
    legacy = get_collection().get(limit=100)
    return not any(
        not metadata.get("tenant_key")
        for metadata in legacy.get("metadatas") or []
    )
