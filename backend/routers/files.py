"""/api/upload + /api/files — owned by Phase B agent B2."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import Document
from backend.schemas.files import FileOut, UploadResponse
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import ingest_document

router = APIRouter()


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
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> UploadResponse:
    data = await file.read()
    try:
        doc = ingest_document(db, file.filename, data)
    except Exception:
        # ingest_document marks the row failed before raising
        raise HTTPException(status_code=400, detail="could not process file")
    return UploadResponse(
        file=doc.title,
        chunks=doc.chunk_count,
        status=_status_label(doc.status),
    )


@router.get("/api/files", response_model=list[FileOut])
def list_files(db: Session = Depends(get_db)) -> list[FileOut]:
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
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
