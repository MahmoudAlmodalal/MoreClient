"""/api/upload + /api/files — owned by Phase B agent B2."""

from threading import Thread

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.core.config import settings as cfg
from backend.models.database import SessionLocal, get_db
from backend.models.tables import Document
from backend.schemas.files import FileOut, UploadResponse
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import create_document_record, index_document

router = APIRouter()


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
def upload_file(
    file: UploadFile = File(...),
    tenant_key: str | None = Form(None),
    db: Session = Depends(get_db),
) -> UploadResponse:
    data = file.file.read()
    try:
        doc = create_document_record(db, file.filename, data, tenant_key=tenant_key)
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
    db: Session = Depends(get_db),
) -> list[FileOut]:
    tenant = (tenant_key or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY
    docs = (
        db.query(Document)
        .filter(Document.tenant_key == tenant)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_to_file_out(doc) for doc in docs]


@router.delete("/api/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)) -> dict:
    doc = db.get(Document, file_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="file not found")
    # keep Chroma + SQL consistent
    vectorstore.delete_document(file_id)
    db.delete(doc)
    db.commit()
    return {"ok": True}
