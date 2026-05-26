import asyncio
import base64
import json
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Handoff, Conversation, Settings
from app.websocket_manager import ws_manager


async def deliver_handoff_reply(db: AsyncSession, handoff_id: int, content: str) -> dict:
    result = await db.execute(select(Handoff).where(Handoff.id == handoff_id))
    handoff = result.scalar_one_or_none()
    if not handoff:
        return {"ok": False, "status": "error", "detail": "Handoff not found"}

    result = await db.execute(select(Conversation).where(Conversation.id == handoff.conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        handoff.delivery_status = "failed"
        handoff.delivery_detail = "Conversation missing"
        await db.commit()
        return {"ok": False, "status": "error", "detail": "Conversation missing"}

    result = await db.execute(select(Settings).where(Settings.tenant_id == handoff.tenant_id))
    s = result.scalar_one_or_none()

    customer_ref = conv.customer_ref
    delays = [0, 1, 2]

    last_result: dict = {"ok": False, "status": "error", "detail": "No attempt made"}
    for attempt, delay in enumerate(delays):
        if delay:
            await asyncio.sleep(delay)
        handoff.delivery_attempts = attempt + 1
        try:
            last_result = await _dispatch_once(handoff, conv, s, customer_ref, content)
        except Exception as e:
            last_result = {"ok": False, "status": "error", "detail": str(e)}

        handoff.delivery_status = "delivered" if last_result["ok"] else "failed"
        handoff.delivery_detail = last_result.get("detail")
        await db.commit()

        if last_result["ok"]:
            break

    return last_result


async def _dispatch_once(handoff: Handoff, conv: Conversation | None, s: Settings | None, customer_ref: str, content: str) -> dict:
    channel = handoff.channel

    if channel == "web":
        delivered = await ws_manager.broadcast_chat(customer_ref, {"type": "agent_message", "content": content})
        return {"ok": delivered, "status": "delivered" if delivered else "pending", "detail": None}

    if channel == "telegram":
        if not s or not s.telegram_token or not s.is_telegram_active:
            return {"ok": False, "status": "error", "detail": "Telegram not configured"}
        url = f"https://api.telegram.org/bot{s.telegram_token}/sendMessage"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json={"chat_id": customer_ref, "text": content})
            ok = resp.status_code == 200
            return {"ok": ok, "status": "delivered" if ok else "failed", "detail": resp.text if not ok else None}

    if channel == "whatsapp":
        if not s or not s.twilio_sid or not s.twilio_token or not s.twilio_number or not s.is_whatsapp_active:
            return {"ok": False, "status": "error", "detail": "WhatsApp not configured"}
        url = f"https://api.twilio.com/2010-04-01/Accounts/{s.twilio_sid}/Messages.json"
        creds = base64.b64encode(f"{s.twilio_sid}:{s.twilio_token}".encode()).decode()
        data = {"To": f"whatsapp:{customer_ref}", "From": f"whatsapp:{s.twilio_number}", "Body": content}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, data=data, headers={"Authorization": f"Basic {creds}"})
            ok = resp.status_code in (200, 201)
            return {"ok": ok, "status": "delivered" if ok else "failed", "detail": resp.text if not ok else None}

    return {"ok": False, "status": "error", "detail": f"Unknown channel: {channel}"}
