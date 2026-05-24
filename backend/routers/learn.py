"""POST /api/learn — owned by Phase B agent B3.

"Teach Bot" + approved handoff answers feeding the KB: persist a LearnedAnswer
row, then best-effort embed it and add it to the vector store so future queries
can retrieve it.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.config import settings as cfg
from backend.models.database import get_db
from backend.models.tables import Conversation, Handoff, LearnedAnswer
from backend.schemas.learn import LearnRequest, LearnResponse
from backend.services.ai import embeddings, vectorstore

router = APIRouter()


@router.post("/api/learn", response_model=LearnResponse)
def learn(body: LearnRequest, db: Session = Depends(get_db)) -> LearnResponse:
    tenant_key = (body.tenant_key or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY
    if body.source_handoff_id is not None:
        handoff = db.get(Handoff, body.source_handoff_id)
        if handoff is not None:
            conv = handoff.conversation or db.get(Conversation, handoff.conversation_id)
            if conv is not None:
                tenant_key = conv.tenant_key

    la = LearnedAnswer(
        tenant_key=tenant_key,
        question=body.question,
        answer=body.answer,
        source_handoff_id=body.source_handoff_id,
    )
    db.add(la)
    db.commit()
    db.refresh(la)

    # Best-effort KB add: a vector/embedding failure must not lose the row.
    try:
        embedding = embeddings.embed_query(f"{body.question}\n{body.answer}")
        vectorstore.add_learned(la.id, body.question, body.answer, embedding, tenant_key=tenant_key)
    except Exception:
        pass

    return LearnResponse(id=la.id, status="learned")
