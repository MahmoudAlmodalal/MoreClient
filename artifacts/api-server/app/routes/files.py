from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Document, DocumentChunk
from app.schemas import FileOut
from app.services.embeddings import embed_texts
from app.services.parser import extract_text, chunk_text
from app.services.serialize import humanize_bytes, iso

router = APIRouter()


def _file_out(doc: Document, tenant_key: str, chunk_count: int) -> FileOut:
    return FileOut(
        id=doc.id,
        tenant_key=tenant_key,
        name=doc.name,
        size=humanize_bytes(doc.size_bytes),
        type=doc.type,
        chunks=chunk_count,
        date=iso(doc.created_at),
        status=doc.status,
    )


@router.get("/files", response_model=list[FileOut])
async def list_files(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.tenant_id == auth["tid"]).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    out = []
    for doc in docs:
        count_result = await db.execute(
            select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id)
        )
        chunk_count = count_result.scalar_one() or 0
        out.append(_file_out(doc, auth["tk"], chunk_count))
    return out


@router.post("/upload")
async def upload_file(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    text, file_type = await extract_text(content, file.filename or "upload", file.content_type or "")
    chunks = chunk_text(text)

    status = "indexed" if chunks else "empty"
    doc = Document(
        tenant_id=auth["tid"],
        name=file.filename or "upload",
        type=file_type,
        size_bytes=len(content),
        status=status,
    )
    db.add(doc)
    await db.flush()

    if chunks:
        embeddings = await embed_texts(chunks)
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            db.add(DocumentChunk(
                tenant_id=auth["tid"],
                document_id=doc.id,
                chunk_index=i,
                content=chunk,
                embedding=emb,
            ))

    await db.commit()
    return {"file": file.filename, "chunks": len(chunks), "status": status}


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == file_id, Document.tenant_id == auth["tid"])
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    await db.delete(doc)
    await db.commit()
    return {"ok": True}
