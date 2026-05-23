"""GET /api/analytics — owned by Phase B agent B3.

No dedicated analytics tables exist; everything is aggregated best-effort from
Conversation / Message / Handoff. Drives the /dashboard KPIs, charts, and the
unanswered queue.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.core.language import detect_language
from backend.models.database import get_db
from backend.models.tables import Conversation, Handoff, Message
from backend.schemas.analytics import (
    AnalyticsResponse,
    ChannelSlice,
    Kpis,
    TopQuestion,
    UnansweredItem,
)

router = APIRouter()

# Assumed dollars saved per question the bot deflected (no real cost data yet).
_COST_PER_DEFLECTED = 2.0
# Placeholder: there is no per-question feedback signal stored yet.
_FEEDBACK_PLACEHOLDER = 4.6


def _time_ago(dt: datetime | None) -> str:
    """Human-friendly relative time, e.g. "5m ago" / "2h ago" / "3d ago"."""
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


@router.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsResponse:
    # --- KPIs --------------------------------------------------------------
    total_questions = (
        db.execute(
            select(func.count()).select_from(Message).where(Message.role == "user")
        ).scalar_one()
        or 0
    )
    handoff_count = (
        db.execute(select(func.count()).select_from(Handoff)).scalar_one() or 0
    )

    if total_questions > 0:
        deflection_rate = 1.0 - (handoff_count / total_questions)
    else:
        deflection_rate = 0.0
    # Clamp to 0..1 (handoffs can theoretically exceed user messages in odd data).
    deflection_rate = max(0.0, min(1.0, deflection_rate))

    deflected = max(0, total_questions - handoff_count)
    cost_savings = deflected * _COST_PER_DEFLECTED

    kpis = Kpis(
        total_questions=total_questions,
        deflection_rate=deflection_rate,
        cost_savings=cost_savings,
        # Placeholder constant — no feedback data is collected yet.
        feedback_score=_FEEDBACK_PLACEHOLDER,
    )

    # --- Top questions -----------------------------------------------------
    top_rows = db.execute(
        select(Message.content, func.count().label("c"))
        .where(Message.role == "user")
        .group_by(Message.content)
        .order_by(func.count().desc())
        .limit(6)
    ).all()
    top_questions = [
        TopQuestion(name=(content or "")[:40], count=count) for content, count in top_rows
    ]

    # --- Channel distribution ---------------------------------------------
    channel_rows = db.execute(
        select(Conversation.channel, func.count().label("c"))
        .group_by(Conversation.channel)
        .order_by(func.count().desc())
    ).all()
    channel_distribution = [
        ChannelSlice(name=(channel or "unknown").capitalize(), value=count)
        for channel, count in channel_rows
    ]

    # --- Unanswered queue (pending handoffs, newest first) ----------------
    pending = db.execute(
        select(Handoff)
        .where(Handoff.status == "pending")
        .order_by(Handoff.created_at.desc())
        .limit(8)
    ).scalars().all()

    unanswered: list[UnansweredItem] = []
    for h in pending:
        last_user_msg = db.execute(
            select(Message.content)
            .where(Message.conversation_id == h.conversation_id, Message.role == "user")
            .order_by(Message.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        question = last_user_msg or ""

        conv_channel = db.execute(
            select(Conversation.channel).where(Conversation.id == h.conversation_id)
        ).scalar_one_or_none()
        channel = conv_channel or "unknown"

        unanswered.append(
            UnansweredItem(
                id=h.id,
                question=question,
                channel=channel,
                language=detect_language(question),
                # Per-message confidence isn't persisted yet — surface 0.0.
                confidence=0.0,
                timeAgo=_time_ago(h.created_at),
            )
        )

    return AnalyticsResponse(
        kpis=kpis,
        top_questions=top_questions,
        channel_distribution=channel_distribution,
        unanswered=unanswered,
    )
