"""/telegram/webhook + /whatsapp/webhook — owned by Phase B agent B6.

Inbound channel webhooks. These routes are mounted WITHOUT the /api prefix
(main.py includes this router prefix-free), so full paths are declared here.

Webhook contract: providers (Telegram, Twilio) retry on any non-200 response,
so these handlers MUST always return HTTP 200. Errors are swallowed and a
benign success/empty-TwiML body is returned instead.
"""

import base64
import hashlib
import hmac
import logging

from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.database import get_db
from backend.models.tables import get_or_create_settings
from backend.services.channels.factory import ChannelFactory

logger = logging.getLogger(__name__)

router = APIRouter()

# Empty TwiML reply — used as the safe fallback for WhatsApp/Twilio.
_EMPTY_TWIML = "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"


def _verify_twilio_signature(token: str, url: str, params: dict, signature: str) -> bool:
    """Validate Twilio's X-Twilio-Signature.

    Prefer the SDK validator; fall back to stdlib HMAC-SHA1 when the twilio package
    is absent (mirroring the optional-import pattern in services/channels/whatsapp.py).
    Twilio signs: the full URL + each POST param (key+value) sorted by key, HMAC-SHA1
    with the auth token, base64-encoded. The URL is rebuilt from BACKEND_PUBLIC_URL so
    it matches the public https endpoint Twilio was configured with, even behind a
    TLS-terminating proxy where request.url would show the internal http host.
    """
    try:
        from twilio.request_validator import RequestValidator

        return RequestValidator(token).validate(url, params, signature)
    except ImportError:
        data = url + "".join(k + params[k] for k in sorted(params))
        mac = hmac.new(token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1)
        expected = base64.b64encode(mac.digest()).decode("ascii")
        return hmac.compare_digest(expected, signature or "")


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Telegram Bot API update webhook (JSON body).

    The adapter checks the active flag + token internally and sends any reply
    via the Bot API. Always returns 200 so Telegram does not retry.
    """
    secret = settings.TELEGRAM_WEBHOOK_SECRET
    if secret and not hmac.compare_digest(
        request.headers.get("X-Telegram-Bot-Api-Secret-Token", ""), secret
    ):
        logger.warning("Telegram webhook secret mismatch — dropping update")
        return {"ok": True}  # drop, still 200 so Telegram does not retry
    try:
        payload = await request.json()
        channel = ChannelFactory.get("telegram")
        inbound = channel.parse(payload, db)
        if inbound is not None:
            channel.deliver(inbound, channel.reply(inbound, db), db)
    except Exception:
        # Swallow — webhooks must never surface a non-200 to the provider.
        logger.exception("Telegram webhook processing error")
    return {"ok": True}


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """Twilio WhatsApp inbound webhook (application/x-www-form-urlencoded).

    The adapter returns a TwiML XML string (empty TwiML when inactive/invalid)
    which is sent straight back as the HTTP body. Always returns 200.
    """
    try:
        form = await request.form()
        form_dict = dict(form)
        setting = get_or_create_settings(db)
        if setting.twilio_token and not _verify_twilio_signature(
            token=setting.twilio_token,
            url=settings.BACKEND_PUBLIC_URL + request.url.path,
            params=form_dict,
            signature=request.headers.get("X-Twilio-Signature", ""),
        ):
            logger.warning("Twilio signature mismatch — dropping inbound message")
            return Response(content=_EMPTY_TWIML, media_type="application/xml")
        channel = ChannelFactory.get("whatsapp")
        inbound = channel.parse(form_dict, db)
        twiml = (
            channel.deliver(inbound, channel.reply(inbound, db), db)
            if inbound is not None
            else _EMPTY_TWIML
        )
        return Response(content=twiml, media_type="application/xml")
    except Exception:
        # On any failure, reply with empty TwiML at status 200 so Twilio
        # treats it as handled and does not retry.
        return Response(content=_EMPTY_TWIML, media_type="application/xml")
