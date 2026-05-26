from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Conversation, Message, Handoff, Settings
from app.schemas import ChatRequest, ChatResponse, AgentMessageOut
from app.services.lang import detect_language, classify_intent
from app.config import settings
from app.services.llm import llm_complete, llm_complete_local_first
from app.services.retrieval import hybrid_search
from app.services.tenant import find_tenant_by_key, ensure_settings
from app.services.serialize import iso
from app.websocket_manager import ws_manager

router = APIRouter()


async def _ingest(
    db: AsyncSession,
    tenant_key: str,
    channel: str,
    customer_ref: str,
    message_text: str,
) -> dict:
    tenant = await find_tenant_by_key(db, tenant_key)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    s = await ensure_settings(db, tenant.id)

    # Get or create conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.tenant_id == tenant.id,
            Conversation.customer_ref == customer_ref,
            Conversation.channel == channel,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        lang = detect_language(message_text)
        conv = Conversation(
            tenant_id=tenant.id,
            customer_ref=customer_ref,
            channel=channel,
            language=lang,
        )
        db.add(conv)
        await db.flush()

    # Determine if this conversation qualifies for local LLM routing
    use_local = (
        conv.language == "ar"
        and getattr(s, "local_llm_arabic_enabled", False)
        and settings.local_llm_enabled
    )

    # Store user message
    user_msg = Message(conversation_id=conv.id, role="user", content=message_text, is_local=use_local)
    db.add(user_msg)
    await db.flush()

    # Retrieve context
    chunks = await hybrid_search(db, tenant.id, message_text)
    confidence = chunks[0]["score"] if chunks else 0.0
    top_content = chunks[0]["content"] if chunks else ""

    # Intent classification
    intent = classify_intent(message_text)

    # Escalation decision
    should_escalate = (
        intent == "human_request"
        or (intent == "complaint" and s.auto_handoff_on_complaint)
        or (confidence < s.confidence_threshold and not chunks)
    )

    answer = ""
    used_llm = False
    answered_locally = False
    fallback = None
    handoff_out = None

    if should_escalate:
        reason = (
            "user_requested" if intent == "human_request"
            else "complaint" if intent == "complaint"
            else "low_confidence"
        )
        handoff = Handoff(
            tenant_id=tenant.id,
            conversation_id=conv.id,
            channel=channel,
            reason=reason,
            question=message_text,
            language=conv.language,
        )
        db.add(handoff)
        await db.flush()
        answer = "I'm connecting you with a human agent who will assist you shortly."
        handoff_out = {"id": handoff.id}
        await ws_manager.broadcast_dashboard(tenant.id, {"type": "handoff.created", "id": handoff.id})
    elif chunks:
        bot_name = s.bot_name or "Assistant"
        company = s.company_name or ""
        tone = s.bot_tone or "professional"
        extra = s.system_prompt_extra or ""
        system = (
            f"You are {bot_name}, a {tone} customer support assistant for {company}. "
            f"{extra}\nAnswer based on the following context:\n\n"
            + "\n\n".join(c["content"] for c in chunks)
        )
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": message_text}]
        llm_answer, answered_locally = await llm_complete_local_first(msgs, prefer_local=use_local)
        if llm_answer:
            answer = llm_answer
            used_llm = True
        else:
            # Fallback: first sentences from top chunk
            sentences = top_content.split(". ")
            answer = ". ".join(sentences[:2]).strip()
            if answer and not answer.endswith("."):
                answer += "."
            fallback = "llm_unavailable"
            answered_locally = False
    else:
        answer = "I don't have enough information to answer that. Please try rephrasing."
        fallback = "no_context"

    # Store assistant message
    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=answer,
        confidence=confidence,
        is_local=answered_locally,
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "answer": answer,
        "confidence": confidence,
        "handoff": handoff_out,
        "reply": answer,
        "language": conv.language,
        "escalate": should_escalate,
        "sender": "human" if should_escalate else "bot",
        "used_llm": used_llm,
        "fallback": fallback,
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    tenant_key = body.get_tenant_key()
    if not tenant_key:
        raise HTTPException(status_code=400, detail="tenant_key is required")
    result = await _ingest(db, tenant_key, body.channel, body.session_id, body.message)
    return ChatResponse(**result)


@router.get("/chat/{session_id}/agent-messages", response_model=list[AgentMessageOut])
async def agent_messages(
    session_id: str,
    tenant_key: str = Query(...),
    after_id: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    from app.services.tenant import find_tenant_by_key
    tenant = await find_tenant_by_key(db, tenant_key)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = await db.execute(
        select(Conversation).where(
            Conversation.tenant_id == tenant.id,
            Conversation.customer_ref == session_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        return []

    result = await db.execute(
        select(Message).where(
            Message.conversation_id == conv.id,
            Message.role == "agent",
            Message.id > after_id,
        ).order_by(Message.id.asc())
    )
    msgs = result.scalars().all()
    return [AgentMessageOut(id=m.id, role=m.role, content=m.content, time=iso(m.created_at)) for m in msgs]
