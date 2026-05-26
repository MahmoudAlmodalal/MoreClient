import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Conversation, Handoff, Message
from app.schemas import (
    HandoffOut, HandoffMessageOut, DeliveryInfo, ReplyRequest,
    FeedbackRequest, SimulateRequest, BulkDeleteRequest, BulkDeleteResponse,
)
from app.services.delivery import deliver_handoff_reply
from app.services.serialize import time_ago, iso
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/handoffs")


async def _load_handoff_out(db: AsyncSession, h: Handoff) -> HandoffOut:
    result = await db.execute(select(Conversation).where(Conversation.id == h.conversation_id))
    conv = result.scalar_one_or_none()

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == h.conversation_id)
        .order_by(Message.created_at.asc())
    )
    msgs = result.scalars().all()

    return HandoffOut(
        id=h.id,
        tenant_id=h.tenant_id,
        conversation_id=h.conversation_id,
        channel=h.channel,
        reason=h.reason,
        question=h.question,
        language=h.language,
        status=h.status,
        unreplied=h.unreplied,
        csat_score=h.csat_score,
        created_at=iso(h.created_at),
        time_ago=time_ago(h.created_at),
        messages=[HandoffMessageOut(id=m.id, role=m.role, content=m.content, time=iso(m.created_at)) for m in msgs],
        customer_ref=conv.customer_ref if conv else "",
        is_test=bool(conv and conv.customer_ref.startswith("test-")),
        delivery=DeliveryInfo(
            status=h.delivery_status,
            attempts=h.delivery_attempts,
            detail=h.delivery_detail,
            ok=h.delivery_status == "delivered",
        ),
    )


@router.get("", response_model=list[HandoffOut])
async def list_handoffs(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None),
    channel: str | None = Query(None),
):
    q = select(Handoff).where(Handoff.tenant_id == auth["tid"])
    if status:
        q = q.where(Handoff.status == status)
    if channel:
        q = q.where(Handoff.channel == channel)
    q = q.order_by(Handoff.created_at.desc()).limit(200)
    result = await db.execute(q)
    handoffs = result.scalars().all()
    return [await _load_handoff_out(db, h) for h in handoffs]


@router.post("/simulate")
async def simulate(
    body: SimulateRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    customer_ref = f"test-{uuid.uuid4().hex[:8]}"
    conv = Conversation(
        tenant_id=auth["tid"],
        customer_ref=customer_ref,
        channel=body.channel,
        language="en",
    )
    db.add(conv)
    await db.flush()

    msg_text = body.message or "This is a simulated test message."
    db.add(Message(conversation_id=conv.id, role="user", content=msg_text))

    handoff = Handoff(
        tenant_id=auth["tid"],
        conversation_id=conv.id,
        channel=body.channel,
        reason="test",
        question=msg_text,
        language="en",
    )
    db.add(handoff)
    await db.commit()
    await db.refresh(handoff)

    await ws_manager.broadcast_dashboard(auth["tid"], {"type": "handoff.created", "id": handoff.id})
    return await _load_handoff_out(db, handoff)


@router.post("/{handoff_id}/reply")
async def reply(
    handoff_id: int,
    body: ReplyRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Handoff).where(Handoff.id == handoff_id, Handoff.tenant_id == auth["tid"])
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Handoff not found")

    content = body.get_content()
    if not content:
        raise HTTPException(status_code=400, detail="message is required")

    db.add(Message(conversation_id=h.conversation_id, role="agent", content=content))
    h.unreplied = False
    await db.commit()

    await deliver_handoff_reply(db, handoff_id, content)
    await ws_manager.broadcast_dashboard(auth["tid"], {"type": "handoff.replied", "id": handoff_id})

    await db.refresh(h)
    return await _load_handoff_out(db, h)


@router.post("/{handoff_id}/resolve")
async def resolve(
    handoff_id: int,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    result = await db.execute(
        select(Handoff).where(Handoff.id == handoff_id, Handoff.tenant_id == auth["tid"])
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Handoff not found")

    h.status = "resolved"
    h.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await ws_manager.broadcast_dashboard(auth["tid"], {"type": "handoff.resolved", "id": handoff_id})
    return {"ok": True}


@router.delete("", response_model=BulkDeleteResponse)
async def bulk_delete(
    body: BulkDeleteRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    if not body.ids:
        return BulkDeleteResponse(deleted=0)

    result = await db.execute(
        select(Handoff).where(Handoff.id.in_(body.ids), Handoff.tenant_id == auth["tid"])
    )
    handoffs = result.scalars().all()
    if len(handoffs) != len(body.ids):
        raise HTTPException(status_code=403, detail="Some handoffs not found or not owned")

    conv_ids = {h.conversation_id for h in handoffs}

    for h in handoffs:
        await db.delete(h)
    await db.flush()

    # Clean up orphaned conversations
    for conv_id in conv_ids:
        remaining = await db.execute(select(Handoff).where(Handoff.conversation_id == conv_id).limit(1))
        if not remaining.scalar_one_or_none():
            conv = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            c = conv.scalar_one_or_none()
            if c:
                await db.delete(c)

    await db.commit()

    for h in handoffs:
        await ws_manager.broadcast_dashboard(auth["tid"], {"type": "handoff.deleted", "id": h.id})

    return BulkDeleteResponse(deleted=len(handoffs))


@router.post("/{handoff_id}/feedback")
async def feedback(
    handoff_id: int,
    body: FeedbackRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    if body.score < 1 or body.score > 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")
    result = await db.execute(
        select(Handoff).where(Handoff.id == handoff_id, Handoff.tenant_id == auth["tid"])
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Handoff not found")
    h.csat_score = body.score
    await db.commit()
    return {"ok": True}


@router.post("/{handoff_id}/retry-delivery")
async def retry_delivery(
    handoff_id: int,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Handoff).where(Handoff.id == handoff_id, Handoff.tenant_id == auth["tid"])
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Handoff not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == h.conversation_id, Message.role == "agent")
        .order_by(Message.id.desc())
        .limit(1)
    )
    last_msg = result.scalar_one_or_none()
    if not last_msg:
        raise HTTPException(status_code=400, detail="No agent message to retry")

    h.delivery_status = "pending"
    h.delivery_attempts = 0
    await db.commit()

    delivery = await deliver_handoff_reply(db, handoff_id, last_msg.content)
    return {"delivery": delivery}
