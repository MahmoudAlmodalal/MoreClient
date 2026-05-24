"""/telegram/webhook + /whatsapp/webhook — owned by Phase B agent B6.

Inbound channel webhooks. These routes are mounted WITHOUT the /api prefix
(main.py includes this router prefix-free), so full paths are declared here.

Webhook contract: providers (Telegram, Twilio) retry on any non-200 response,
so these handlers MUST always return HTTP 200. Errors are swallowed and a
benign success/empty-TwiML body is returned instead.
"""

import logging

from fastapi import APIRouter, Request, Response, Depends
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.services.channels.factory import ChannelFactory

logger = logging.getLogger(__name__)

router = APIRouter()

# Empty TwiML reply — used as the safe fallback for WhatsApp/Twilio.
_EMPTY_TWIML = "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Telegram Bot API update webhook (JSON body).

    The adapter checks the active flag + token internally and sends any reply
    via the Bot API. Always returns 200 so Telegram does not retry.
    """
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
        channel = ChannelFactory.get("whatsapp")
        inbound = channel.parse(dict(form), db)
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
