"""Repair helpers that keep SQL document rows and Chroma vectors in sync."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.tables import Document
from backend.services.ai import embeddings, vectorstore
from backend.services.ingestion.chunker import chunk_text


def ensure_tenant_documents_indexed(db: Session, tenant_key: str) -> int:
    """Re-index completed SQL documents whose deterministic Chroma ids are absent.

    Local demo stores can be deleted independently from SQLite. When that happens
    the dashboard still shows uploaded files, but retrieval cannot see them. This
    lightweight repair runs on the chat path and restores only missing documents.
    """
    stmt = (
        select(Document)
        .where(
            Document.tenant_key == tenant_key,
            Document.status == "completed",
            Document.content.is_not(None),
        )
        .order_by(Document.id.asc())
    )
    restored = 0
    for doc in db.scalars(stmt):
        if vectorstore.has_document(doc.id):
            continue
        chunks = chunk_text(doc.content or "")
        if not chunks:
            continue
        vectors = embeddings.embed_texts(chunks)
        vectorstore.add_document_chunks(doc.id, chunks, vectors, tenant_key=tenant_key)
        if doc.chunk_count != len(chunks):
            doc.chunk_count = len(chunks)
        restored += len(chunks)
    return restored
