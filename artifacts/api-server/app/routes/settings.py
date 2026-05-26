import httpx
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings as cfg
from app.database import get_db
from app.models import Conversation, Message, Settings
from app.schemas import SettingsOut, SettingsPatchRequest
from app.services.tenant import ensure_settings

router = APIRouter()

ALLOWED_KEYS = {
    "company_name", "bot_name", "company_logo", "bot_tone", "system_prompt_extra",
    "telegram_token", "is_telegram_active",
    "twilio_sid", "twilio_token", "twilio_number", "is_whatsapp_active",
    "subscription_plan", "confidence_threshold",
    "purchase_flow_enabled", "purchase_collect_address", "purchase_collect_quantity",
    "purchase_auto_forward_to_support", "purchase_confirmation_required",
    "purchase_session_minutes", "purchase_currency_label",
    "intent_llm_enabled", "intent_confidence_threshold", "auto_handoff_on_complaint",
}


def _settings_out(s: Settings, tenant_key: str, used_messages: int) -> SettingsOut:
    return SettingsOut(
        tenant_key=tenant_key,
        company_name=s.company_name,
        bot_name=s.bot_name or "Assistant",
        company_logo=s.company_logo,
        bot_tone=s.bot_tone or "professional",
        system_prompt_extra=s.system_prompt_extra,
        telegram_token=s.telegram_token,
        is_telegram_active=s.is_telegram_active,
        twilio_sid=s.twilio_sid,
        twilio_token=s.twilio_token,
        twilio_number=s.twilio_number,
        is_whatsapp_active=s.is_whatsapp_active,
        subscription_plan=s.subscription_plan,
        confidence_threshold=s.confidence_threshold,
        purchase_flow_enabled=s.purchase_flow_enabled,
        purchase_collect_address=s.purchase_collect_address,
        purchase_collect_quantity=s.purchase_collect_quantity,
        purchase_auto_forward_to_support=s.purchase_auto_forward_to_support,
        purchase_confirmation_required=s.purchase_confirmation_required,
        purchase_session_minutes=s.purchase_session_minutes,
        purchase_currency_label=s.purchase_currency_label,
        intent_llm_enabled=s.intent_llm_enabled,
        intent_confidence_threshold=s.intent_confidence_threshold,
        auto_handoff_on_complaint=s.auto_handoff_on_complaint,
        used_messages=used_messages,
    )


async def _count_used_messages(db: AsyncSession, tenant_id: int) -> int:
    conv_ids = select(Conversation.id).where(Conversation.tenant_id == tenant_id)
    result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id.in_(conv_ids))
    )
    return result.scalar_one() or 0


@router.get("/settings", response_model=SettingsOut)
async def get_settings(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    s = await ensure_settings(db, auth["tid"])
    used = await _count_used_messages(db, auth["tid"])
    return _settings_out(s, auth["tk"], used)


@router.put("/settings", response_model=SettingsOut)
async def update_settings(
    body: SettingsPatchRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    s = await ensure_settings(db, auth["tid"])
    old_token = s.telegram_token

    data = body.model_dump(exclude_none=True)
    for key, value in data.items():
        if key in ALLOWED_KEYS:
            setattr(s, key, value)

    # Auto-register Telegram webhook when token changes
    new_token = data.get("telegram_token")
    if new_token and new_token != old_token and cfg.public_api_url:
        webhook_url = f"{cfg.public_api_url.rstrip('/')}/telegram/webhook?tenantKey={auth['tk']}"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"https://api.telegram.org/bot{new_token}/setWebhook",
                    json={"url": webhook_url},
                )
        except Exception:
            pass

    await db.commit()
    await db.refresh(s)
    used = await _count_used_messages(db, auth["tid"])
    return _settings_out(s, auth["tk"], used)


# Also accept PATCH
@router.patch("/settings", response_model=SettingsOut)
async def patch_settings(
    body: SettingsPatchRequest,
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    return await update_settings(body, auth, db)
