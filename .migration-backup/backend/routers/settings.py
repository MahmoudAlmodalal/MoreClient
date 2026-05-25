"""GET/PUT /api/settings — owned by Phase B agent B5.

3-layer-lite: route handler -> get_or_create_settings -> ORM. The single
config row (id=1) holds tenant/bot config. The frontend speaks camelCase via
the SettingsOut/SettingsUpdate aliases.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core import crypto
from backend.models.database import get_db
from backend.models.tables import get_or_create_settings
from backend.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter()

# Fields PUT may mutate: the update schema's own fields, minus billing/internal
# counters. used_messages is bumped only by the chat pipeline, never via this route.
_SETTABLE = set(SettingsUpdate.model_fields) - {"used_messages"}

# Secret fields encrypted at rest and masked in responses (core/crypto.py).
_SECRET_FIELDS = ("telegram_token", "twilio_token")


def _masked_out(row) -> SettingsOut:
    """Serialize the config row, replacing at-rest secrets with masked display
    values so raw credentials never leave the backend."""
    out = SettingsOut.model_validate(row)
    out.telegram_token = crypto.mask(row.telegram_token)
    out.twilio_token = crypto.mask(row.twilio_token)
    return out


@router.get("/api/settings", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)) -> SettingsOut:
    return _masked_out(get_or_create_settings(db))


@router.put("/api/settings", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate, db: Session = Depends(get_db)
) -> SettingsOut:
    row = get_or_create_settings(db)

    incoming = payload.model_dump(exclude_unset=True, by_alias=False)

    # Apply only the fields the client actually sent (partial update).
    for key, value in incoming.items():
        if key not in _SETTABLE:
            continue
        if key in _SECRET_FIELDS:
            # Ignore an echoed mask placeholder (••••1234) so it never clobbers
            # the stored secret; otherwise encrypt the new value at rest.
            if crypto.is_masked(value):
                continue
            value = crypto.encrypt(value)
        setattr(row, key, value)

    db.commit()
    db.refresh(row)

    # If Telegram-related fields were touched, restart the poller so changes
    # (new token, activation toggle) take effect immediately.
    if "telegram_token" in incoming or "is_telegram_active" in incoming:
        from backend.services.channels import telegram_poller

        telegram_poller.ensure_running_if_active()

    return _masked_out(row)
