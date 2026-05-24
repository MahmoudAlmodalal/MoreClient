"""/api/upload + /api/files — owned by Phase B agent B2."""

from threading import Thread
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request
from sqlalchemy.orm import Session

from backend.core.config import settings as cfg
from backend.core.ratelimit import UPLOAD_LIMIT, limiter
from backend.models.database import SessionLocal, get_db
from backend.models.tables import Document
from backend.schemas.files import FileOut, UploadResponse
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import create_document_record, index_document

router = APIRouter()


# Upload guardrails. Extensions mirror ingest._detect_type's dispatch so we
# reject anything ingestion would silently treat as plain text.
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt", ".md"}
_MAX_FILENAME_LEN = 200

# Magic-byte signatures: a declared extension must match the file's real header,
# so a binary renamed to .pdf can't slip past the extension whitelist. Text
# formats (.txt/.md) have no reliable signature and are left to ingestion.
_PDF_MAGIC = b"%PDF"
_ZIP_MAGIC = b"PK\x03\x04"  # docx/xlsx are zip containers


def _sanitize_filename(raw: str | None) -> str:
    """Strip path components and control chars; cap length. Never trust the
    client-supplied name for storage or display."""
    name = PurePath(raw or "").name  # drops any directory traversal segments
    name = "".join(ch for ch in name if ch.isprintable() and ch not in '\r\n\t').strip()
    name = name[:_MAX_FILENAME_LEN]
    return name or "upload"


def _content_matches_extension(extension: str, data: bytes) -> bool:
    """Lightweight magic-byte check for binary formats."""
    if extension == ".pdf":
        return data[:4] == _PDF_MAGIC
    if extension in (".docx", ".xlsx"):
        return data[:4] == _ZIP_MAGIC
    return True  # .txt / .md — no signature to verify


def _index_document_background(document_id: int) -> None:
    db = SessionLocal()
    try:
        index_document(db, document_id)
    finally:
        db.close()


def _human_size(n_bytes: int | None) -> str:
    """Format a byte count into a human string, e.g. "340 KB" / "2.4 MB"."""
    if not n_bytes:
        return "0 KB"
    if n_bytes >= 1024 * 1024:
        return f"{n_bytes / (1024 * 1024):.1f} MB"
    if n_bytes >= 1024:
        return f"{round(n_bytes / 1024)} KB"
    return f"{n_bytes} B"


def _status_label(status: str | None) -> str:
    """Map stored lowercase status to a display label."""
    mapping = {
        "completed": "Completed",
        "processing": "Processing",
        "failed": "Failed",
    }
    if not status:
        return "Processing"
    return mapping.get(status.lower(), status.capitalize())


def _to_file_out(doc: Document) -> FileOut:
    return FileOut(
        id=doc.id,
        tenant_key=doc.tenant_key,
        name=doc.title,
        size=_human_size(doc.file_size),
        type=doc.file_type or "txt",
        chunks=doc.chunk_count,
        date=doc.created_at.date().isoformat(),
        status=_status_label(doc.status),
    )


@router.post("/api/upload", response_model=UploadResponse)
@limiter.limit(UPLOAD_LIMIT)
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    tenant_key: str | None = Form(None),
    db: Session = Depends(get_db),
) -> UploadResponse:
    data = file.file.read()
    safe_name = _sanitize_filename(file.filename)
    extension = PurePath(safe_name).suffix.lower()

    if extension not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="unsupported file type (allowed: pdf, docx, xlsx, txt, md)",
        )

    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large (max 10MB)")

    if not _content_matches_extension(extension, data):
        raise HTTPException(
            status_code=415,
            detail="file content does not match its extension",
        )

    try:
        doc = create_document_record(db, safe_name, data, tenant_key=tenant_key)
    except Exception:
        raise HTTPException(status_code=400, detail="could not process file")
    Thread(target=_index_document_background, args=(doc.id,), daemon=True).start()
    return UploadResponse(
        file=doc.title,
        chunks=doc.chunk_count,
        status=_status_label(doc.status),
    )


@router.get("/api/files", response_model=list[FileOut])
def list_files(
    tenant_key: str | None = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[FileOut]:
    tenant = (tenant_key or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY
    docs = (
        db.query(Document)
        .filter(Document.tenant_key == tenant)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_to_file_out(doc) for doc in docs]


@router.delete("/api/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)) -> dict:
    doc = db.get(Document, file_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="file not found")
    # keep Chroma + SQL consistent: delete vectors first so a Chroma failure leaves
    # the SQL row intact (and surfaces a clean error) rather than orphaning vectors.
    try:
        vectorstore.delete_document(file_id)
    except Exception:
        raise HTTPException(status_code=502, detail="could not delete file vectors")
    db.delete(doc)
    db.commit()
    return {"ok": True}
