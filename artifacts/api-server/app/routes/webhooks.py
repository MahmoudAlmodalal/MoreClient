import base64
import hashlib
import hmac
import urllib.parse
from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.database import get_db
from app.routes.chat import _ingest
from app.models import Settings
from app.services.tenant import find_tenant_by_key
from sqlalchemy import select
import httpx

router = APIRouter()


def _verify_telegram(request_headers: dict, secret: str | None) -> bool:
    if not secret:
        return True
    incoming = request_headers.get("x-telegram-bot-api-secret-token", "")
    return hmac.compare_digest(incoming.encode(), secret.encode())


def _verify_twilio(url: str, params: dict, auth_token: str | None, signature: str) -> bool:
    if not auth_token:
        return True
    sorted_params = "".join(k + v for k, v in sorted(params.items()))
    computed = base64.b64encode(
        hmac.new(auth_token.encode(), (url + sorted_params).encode(), hashlib.sha1).digest()
    ).decode()
    return hmac.compare_digest(computed, signature)


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    tenant_key: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    tenant = await find_tenant_by_key(db, tenant_key)
    if not tenant:
        return {"ok": True}

    s_result = await db.execute(select(Settings).where(Settings.tenant_id == tenant.id))
    s = s_result.scalar_one_or_none()

    headers = dict(request.headers)
    if not _verify_telegram(headers, s.telegram_webhook_secret if s else None):
        return {"ok": True}  # Always 200 to prevent Telegram retries

    body = await request.json()
    msg = body.get("message") or body.get("edited_message")
    if not msg:
        return {"ok": True}

    text = msg.get("text", "")
    chat_id = str(msg.get("chat", {}).get("id", ""))
    if not text or not chat_id:
        return {"ok": True}

    try:
        result = await _ingest(db, tenant_key, "telegram", chat_id, text)
    except Exception:
        return {"ok": True}

    # Reply via Telegram sendMessage
    if s and s.telegram_token and s.is_telegram_active:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"https://api.telegram.org/bot{s.telegram_token}/sendMessage",
                    json={"chat_id": chat_id, "text": result["answer"]},
                )
        except Exception:
            pass

    return {"ok": True}


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    request: Request,
    tenant_key: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    tenant = await find_tenant_by_key(db, tenant_key)
    if not tenant:
        return Response(content="<Response></Response>", media_type="text/xml")

    s_result = await db.execute(select(Settings).where(Settings.tenant_id == tenant.id))
    s = s_result.scalar_one_or_none()

    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}
    signature = request.headers.get("x-twilio-signature", "")
    url = str(request.url)

    if not _verify_twilio(url, params, s.twilio_token if s else None, signature):
        return Response(content="<Response></Response>", media_type="text/xml")

    from_number = params.get("From", "").replace("whatsapp:", "")
    message_body = params.get("Body", "")
    if not from_number or not message_body:
        return Response(content="<Response></Response>", media_type="text/xml")

    try:
        await _ingest(db, tenant_key, "whatsapp", from_number, message_body)
    except Exception:
        pass

    return Response(content="<Response></Response>", media_type="text/xml")
