from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Document, DocumentChunk, LearnedAnswer
from app.schemas import LearnRequest, LearnResponse
from app.services.embeddings import embed_one

router = APIRouter()


@router.post("/learn", response_model=LearnResponse)
async def learn(
    body: LearnRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    learned = LearnedAnswer(
        tenant_id=auth["tid"],
        question=body.question,
        answer=body.answer,
        source_handoff_id=body.source_handoff_id,
    )
    db.add(learned)
    await db.flush()

    text = f"Q: {body.question}\nA: {body.answer}"
    doc = Document(
        tenant_id=auth["tid"],
        name=f"learned-{learned.id}",
        type="learned",
        size_bytes=len(text.encode()),
        status="indexed",
        source=f"learned-{learned.id}",
    )
    db.add(doc)
    await db.flush()

    embedding = await embed_one(text)
    db.add(DocumentChunk(
        tenant_id=auth["tid"],
        document_id=doc.id,
        chunk_index=0,
        content=text,
        embedding=embedding,
    ))

    await db.commit()
    return LearnResponse(ok=True, id=learned.id, document_id=doc.id)
