from datetime import datetime, timezone
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Conversation, Handoff, Message
from app.schemas import AnalyticsResponse, KPIs, TopQuestion, ChannelDist, UnansweredItem
from app.services.serialize import time_ago


async def build_analytics(db: AsyncSession, tenant_id: int) -> AnalyticsResponse:
    # Total user messages (questions)
    conv_ids = select(Conversation.id).where(Conversation.tenant_id == tenant_id)
    total_q_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.conversation_id.in_(conv_ids),
            Message.role == "user",
        )
    )
    total_questions = total_q_result.scalar_one() or 0

    # Deflection rate = (questions not escalated) / total
    pending_result = await db.execute(
        select(func.count(Handoff.id)).where(Handoff.tenant_id == tenant_id)
    )
    total_handoffs = pending_result.scalar_one() or 0
    deflection_rate = round((1 - total_handoffs / total_questions) * 100, 1) if total_questions else 0.0

    cost_savings = round(total_questions * 0.5, 2)

    # Feedback score
    score_result = await db.execute(
        select(func.avg(Handoff.csat_score)).where(
            Handoff.tenant_id == tenant_id,
            Handoff.csat_score.is_not(None),
        )
    )
    avg_score = score_result.scalar_one()
    feedback_score = round(float(avg_score), 2) if avg_score else 0.0

    # Top questions (user messages)
    top_q_result = await db.execute(
        select(Message.content, func.count(Message.id).label("cnt"))
        .where(Message.conversation_id.in_(conv_ids), Message.role == "user")
        .group_by(Message.content)
        .order_by(text("cnt DESC"))
        .limit(5)
    )
    top_questions = [TopQuestion(name=r[0], count=r[1]) for r in top_q_result.all()]

    # Channel distribution
    ch_result = await db.execute(
        select(Conversation.channel, func.count(Conversation.id).label("cnt"))
        .where(Conversation.tenant_id == tenant_id)
        .group_by(Conversation.channel)
    )
    channel_distribution = [ChannelDist(name=r[0], value=r[1]) for r in ch_result.all()]

    # Unanswered (pending handoffs with low-confidence reason)
    unanswered_result = await db.execute(
        select(Handoff)
        .where(Handoff.tenant_id == tenant_id, Handoff.status == "pending")
        .order_by(Handoff.created_at.desc())
        .limit(10)
    )
    unanswered = []
    for h in unanswered_result.scalars().all():
        unanswered.append(UnansweredItem(
            id=h.id,
            question=h.question or "",
            channel=h.channel,
            language=h.language,
            confidence=0.0,
            time_ago=time_ago(h.created_at),
        ))

    return AnalyticsResponse(
        kpis=KPIs(
            total_questions=total_questions,
            deflection_rate=deflection_rate,
            cost_savings=cost_savings,
            feedback_score=feedback_score,
        ),
        top_questions=top_questions,
        channel_distribution=channel_distribution,
        unanswered=unanswered,
    )
