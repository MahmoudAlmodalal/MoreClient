"""/api/handoffs — owned by Phase B agent B4.

Drives the /dashboard/handoffs queue: list pending human-handoff tickets,
let an agent reply (appends an "agent" message), and resolve a ticket
(closes the conversation).
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.language import detect_language
from backend.models.database import get_db
from backend.models.tables import Conversation, Handoff, Message, PurchaseOrder
from backend.schemas.handoffs import HandoffMessageOut, HandoffOut, ReplyRequest

router = APIRouter()


def _time_ago(dt: datetime | None) -> str:
    """Human-readable relative time, e.g. "5m ago" / "2h ago" / "3d ago"."""
    if dt is None:
        return "just now"
    delta = datetime.utcnow() - dt
    seconds = int(delta.total_seconds())
    if seconds < 0:
        seconds = 0
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


def _build_handoff_out(handoff: Handoff, db: Session) -> HandoffOut:
    """Assemble the frontend-facing HandoffOut for a single handoff."""
    conv = handoff.conversation or db.get(Conversation, handoff.conversation_id)

    rows = (
        db.query(Message)
        .filter(Message.conversation_id == handoff.conversation_id)
        .order_by(Message.id.asc())
        .all()
    )

    messages = [
        HandoffMessageOut(
            id=str(m.id),
            role=m.role,
            content=m.content,
            time=m.created_at.strftime("%H:%M") if m.created_at else "",
        )
        for m in rows
    ]

    first_user = next((m.content for m in rows if m.role == "user"), "")
    language = detect_language(first_user) if first_user else "en"

    unreplied = bool(rows) and rows[-1].role != "agent"

    customer_ref = conv.customer_ref if conv else None
    user = customer_ref or f"Session {handoff.conversation_id}"
    channel = conv.channel if conv else ""
    metadata = {"customerRef": customer_ref} if customer_ref else {}

    order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.conversation_id == handoff.conversation_id)
        .order_by(PurchaseOrder.id.desc())
        .first()
    )
    if order is not None:
        metadata["order"] = {
            "id": order.id,
            "productName": order.product_name,
            "quantity": order.quantity,
            "deliveryAddress": order.delivery_address,
            "status": order.status,
            "state": order.state,
            "orderData": order.order_data or {},
        }

    return HandoffOut(
        id=handoff.id,
        user=user,
        channel=channel,
        reason=handoff.reason or "low_confidence",
        language=language,
        timeAgo=_time_ago(handoff.created_at),
        unreplied=unreplied,
        messages=messages,
        metadata=metadata,
    )


@router.get("/api/handoffs", response_model=list[HandoffOut])
def list_handoffs(channel: str | None = None, db: Session = Depends(get_db)):
    """List pending handoffs, newest first, optionally filtered by channel."""
    query = db.query(Handoff).filter(Handoff.status == "pending")

    if channel:
        query = query.join(
            Conversation, Conversation.id == Handoff.conversation_id
        ).filter(Conversation.channel == channel)

    handoffs = query.order_by(Handoff.created_at.desc(), Handoff.id.desc()).all()
    return [_build_handoff_out(h, db) for h in handoffs]


@router.post("/api/handoffs/{handoff_id}/reply", response_model=HandoffOut)
def reply_handoff(handoff_id: int, body: ReplyRequest, db: Session = Depends(get_db)):
    """Append an agent reply to the handoff's conversation."""
    handoff = db.get(Handoff, handoff_id)
    if handoff is None:
        raise HTTPException(status_code=404, detail="Handoff not found")

    message = Message(
        conversation_id=handoff.conversation_id,
        role="agent",
        content=body.content,
    )
    db.add(message)
    db.commit()

    db.refresh(handoff)
    return _build_handoff_out(handoff, db)


@router.post("/api/handoffs/{handoff_id}/resolve")
def resolve_handoff(handoff_id: int, db: Session = Depends(get_db)):
    """Mark a handoff resolved and close its conversation."""
    handoff = db.get(Handoff, handoff_id)
    if handoff is None:
        raise HTTPException(status_code=404, detail="Handoff not found")

    handoff.status = "resolved"
    handoff.resolved_at = datetime.utcnow()

    conv = handoff.conversation or db.get(Conversation, handoff.conversation_id)
    if conv is not None:
        conv.status = "closed"

    db.commit()
    return {"ok": True}
