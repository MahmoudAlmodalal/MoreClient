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

# Column names we allow PUT to mutate (id is fixed at 1).
_SETTABLE = {c.name for c in Setting.__table__.columns if c.name != "id"}


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
