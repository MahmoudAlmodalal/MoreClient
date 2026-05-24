"""Ingestion orchestrator: parse -> chunk -> embed -> Chroma + Document row.

Used by the /api/upload route handler. Keeps the SQL Document row and the
Chroma chunks consistent (chunk_count is authoritative for the frontend).
"""

from sqlalchemy.orm import Session

from backend.models.tables import Document
from backend.core.config import settings as cfg
from backend.services.ai import embeddings, vectorstore
from backend.services.ingestion import docx as docx_parser
from backend.services.ingestion import pdf as pdf_parser
from backend.services.ingestion import txt as txt_parser
from backend.services.ingestion import xlsx as xlsx_parser
from backend.services.ingestion.chunker import chunk_text


def _detect_type(filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "pdf"
    if name.endswith(".docx"):
        return "docx"
    if name.endswith(".xlsx"):
        return "xlsx"
    if name.endswith(".txt") or name.endswith(".md"):
        return "txt"
    return "txt"


def extract(filename: str, data: bytes) -> tuple[str, str]:
    """Return (file_type, extracted_text)."""
    ftype = _detect_type(filename)
    if ftype == "pdf":
        return ftype, pdf_parser.extract_pdf(data)
    if ftype == "docx":
        return ftype, docx_parser.extract_docx(data)
    if ftype == "xlsx":
        return ftype, xlsx_parser.extract_xlsx(data)
    return ftype, txt_parser.extract_txt(data)


def _tenant_key(value: str | None) -> str:
    return (value or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY


def ingest_document(db: Session, filename: str, data: bytes, tenant_key: str | None = None) -> Document:
    """Parse, chunk, embed, persist. Returns the committed Document row.

    The Document row is created first (status="processing") so a failure mid-way
    is recorded as status="failed" rather than vanishing.
    """
    ftype, text = extract(filename, data)
    doc = Document(
        title=filename,
        tenant_key=_tenant_key(tenant_key),
        content=text,
        source="upload",
        file_size=len(data),
        file_type=ftype,
        chunk_count=0,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        chunks = chunk_text(text)
        if chunks:
            vectors = embeddings.embed_texts(chunks)
            vectorstore.add_document_chunks(doc.id, chunks, vectors, tenant_key=doc.tenant_key)
        doc.chunk_count = len(chunks)
        doc.status = "completed"
        db.commit()
        db.refresh(doc)
    except Exception:
        doc.status = "failed"
        db.commit()
        raise

    return doc


def create_document_record(
    db: Session,
    filename: str,
    data: bytes,
    tenant_key: str | None = None,
) -> Document:
    """Parse and persist a processing row without vectorizing yet."""
    ftype, text = extract(filename, data)
    doc = Document(
        title=filename,
        tenant_key=_tenant_key(tenant_key),
        content=text,
        source="upload",
        file_size=len(data),
        file_type=ftype,
        chunk_count=0,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def index_document(db: Session, document_id: int) -> Document:
    """Chunk, embed, and persist vectors for an existing processing document."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise ValueError(f"document {document_id} not found")

    try:
        chunks = chunk_text(doc.content or "")
        if chunks:
            vectors = embeddings.embed_texts(chunks)
            vectorstore.add_document_chunks(doc.id, chunks, vectors, tenant_key=doc.tenant_key)
        doc.chunk_count = len(chunks)
        doc.status = "completed"
        db.commit()
        db.refresh(doc)
    except Exception:
        doc.status = "failed"
        db.commit()
        raise

    return doc


def extract_and_index_document(
    db: Session, document_id: int, filename: str, data: bytes
) -> Document:
    """Full background pipeline: extract text from raw bytes, then chunk/embed/persist.

    Called by _index_document_background when the upload handler defers extraction.
    The Document row must already exist (status="processing") before this is called.
    """
    doc = db.get(Document, document_id)
    if doc is None:
        raise ValueError(f"document {document_id} not found")
    try:
        ftype, text = extract(filename, data)
        doc.content = text
        doc.file_type = ftype
        db.commit()
        chunks = chunk_text(text)
        if chunks:
            vectors = embeddings.embed_texts(chunks)
            vectorstore.add_document_chunks(doc.id, chunks, vectors, tenant_key=doc.tenant_key)
        doc.chunk_count = len(chunks)
        doc.status = "completed"
        db.commit()
        db.refresh(doc)
    except Exception:
        doc.status = "failed"
        db.commit()
        raise
    return doc
