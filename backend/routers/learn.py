"""POST /api/learn — owned by Phase B agent B3.

"Teach Bot" + approved handoff answers feeding the KB: persist a LearnedAnswer
row, then best-effort embed it and add it to the vector store so future queries
can retrieve it.
"""

from datetime import datetime
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.config import settings as cfg
from backend.models.database import get_db
from backend.models.tables import Conversation, Handoff, LearnedAnswer
from backend.schemas.learn import LearnRequest, LearnResponse
from backend.services.ai import embeddings, vectorstore
from backend.services.realtime import broadcast_dashboard_snapshot
from backend.core.security import get_tenant_key

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/learn", response_model=LearnResponse)
def learn(
    body: LearnRequest,
    db: Session = Depends(get_db),
    tenant_key_dep: str | None = Depends(get_tenant_key),
) -> LearnResponse:
    tenant_key = tenant_key_dep or (body.tenant_key or cfg.DEFAULT_TENANT_KEY).strip().lower() or cfg.DEFAULT_TENANT_KEY
    source_handoff: Handoff | None = None
    source_conversation: Conversation | None = None

    if body.source_handoff_id is not None:
        source_handoff = db.get(Handoff, body.source_handoff_id)
        if source_handoff is not None:
            source_conversation = source_handoff.conversation or db.get(
                Conversation,
                source_handoff.conversation_id,
            )
            if source_conversation is not None:
                tenant_key = source_conversation.tenant_key

    la = LearnedAnswer(
        tenant_key=tenant_key,
        question=body.question,
        answer=body.answer,
        source_handoff_id=body.source_handoff_id,
    )
    db.add(la)

    if source_handoff is not None:
        source_handoff.status = "resolved"
        source_handoff.resolved_at = datetime.utcnow()
        if source_conversation is not None:
            source_conversation.status = "closed"

    db.commit()
    db.refresh(la)

    # Best-effort KB add: a vector/embedding failure must not lose the row.
    try:
        embedding = embeddings.embed_query(f"{body.question}\n{body.answer}")
        vectorstore.add_learned(la.id, body.question, body.answer, embedding, tenant_key=tenant_key)
    except Exception:
        # Row is saved but not yet retrievable — log so the orphan is diagnosable.
        logger.warning("learned answer %s saved but KB embed/add failed", la.id, exc_info=True)

    broadcast_dashboard_snapshot("learn.answer")
    return LearnResponse(id=la.id, status="learned")
