"""Persistent ChromaDB wrapper. SQL Document.id is the join key; chunk ids are
deterministic ("doc-{id}-{i}" / "learned-{id}") so we can delete-by-document
without storing chunk ids in SQL.
"""

from dataclasses import dataclass

import chromadb

from backend.core.config import settings

_collection = None


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


def add_document_chunks(document_id: int, chunks: list[str], embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    ids = [f"doc-{document_id}-{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": document_id, "kind": "document", "chunk_index": i}
        for i in range(len(chunks))
    ]
    get_collection().add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)


def add_learned(learned_id: int, question: str, answer: str, embedding: list[float]) -> None:
    get_collection().add(
        ids=[f"learned-{learned_id}"],
        documents=[f"{question}\n{answer}"],
        embeddings=[embedding],
        metadatas=[{"kind": "learned", "learned_id": learned_id}],
    )


def delete_document(document_id: int) -> None:
    get_collection().delete(where={"document_id": document_id})


def query(embedding: list[float], k: int = 4) -> list[Hit]:
    if is_empty():
        return []
    res = get_collection().query(
        query_embeddings=[embedding],
        n_results=k,
        include=["documents", "distances", "metadatas"],
    )
    docs = (res.get("documents") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    return [Hit(text=d, distance=dist, metadata=m or {}) for d, dist, m in zip(docs, dists, metas)]


def is_empty() -> bool:
    return get_collection().count() == 0
