"""/api/upload + /api/files — owned by Phase B agent B2."""

from pathlib import PurePath

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import Document
from backend.schemas.files import FileOut, UploadResponse
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import ingest_document

router = APIRouter()

# Upload guardrails. Extensions mirror ingest._detect_type's dispatch so we
# reject anything ingestion would silently treat as plain text.
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt", ".md"}


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
        name=doc.title,
        size=_human_size(doc.file_size),
        type=doc.file_type or "txt",
        chunks=doc.chunk_count,
        date=doc.created_at.date().isoformat(),
        status=_status_label(doc.status),
    )


@router.post("/api/upload", response_model=UploadResponse)
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> UploadResponse:
    extension = PurePath(file.filename or "").suffix.lower()
    if extension not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="unsupported file type (allowed: pdf, docx, xlsx, txt, md)",
        )

    data = file.file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large (max 10MB)")

    try:
        # Document.title is NOT NULL — fall back when the client omits a filename.
        doc = ingest_document(db, file.filename or "upload", data)
    except Exception:
        # ingest_document marks the row failed before raising
        raise HTTPException(status_code=400, detail="could not process file")
    return UploadResponse(
        file=doc.title,
        chunks=doc.chunk_count,
        status=_status_label(doc.status),
    )


@router.get("/api/files", response_model=list[FileOut])
def list_files(
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[FileOut]:
    docs = (
        db.query(Document)
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
