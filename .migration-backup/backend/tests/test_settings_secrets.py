"""Settings router secret handling: encrypt-on-write, mask-on-read, echo-skip."""

import pytest

from backend.core import crypto
from backend.core.config import settings as app_settings
from backend.models.tables import get_or_create_settings
from backend.routers.settings import get_settings, update_settings
from backend.schemas.settings import SettingsUpdate


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    """Use a known secret and stop the settings PUT from touching the real DB /
    Telegram poller as a side effect."""
    monkeypatch.setattr(app_settings, "APP_SECRET", "test-secret")
    monkeypatch.setattr(
        "backend.services.channels.telegram_poller.ensure_running_if_active",
        lambda: None,
    )


def test_token_encrypted_at_rest_and_masked_in_response(db_session):
    update_settings(SettingsUpdate(telegram_token="123:ABCdefGHI4567"), db=db_session)

    row = get_or_create_settings(db_session)
    # Stored as ciphertext, never the raw token.
    assert row.telegram_token.startswith("enc::")
    assert row.telegram_token != "123:ABCdefGHI4567"
    assert crypto.decrypt(row.telegram_token) == "123:ABCdefGHI4567"

    # GET masks it for display.
    out = get_settings(db=db_session)
    assert out.telegram_token == "••••4567"


def test_masked_echo_does_not_overwrite_secret(db_session):
    update_settings(SettingsUpdate(telegram_token="123:REALTOKEN9999"), db=db_session)
    original = get_or_create_settings(db_session).telegram_token

    # Client echoes the mask back unchanged — must be ignored.
    update_settings(SettingsUpdate(telegram_token="••••9999"), db=db_session)
    assert get_or_create_settings(db_session).telegram_token == original


def test_twilio_token_also_masked(db_session):
    update_settings(SettingsUpdate(twilio_token="twilio-auth-tokenWXYZ"), db=db_session)
    out = get_settings(db=db_session)
    assert out.twilio_token == "••••WXYZ"
    assert crypto.decrypt(get_or_create_settings(db_session).twilio_token) == "twilio-auth-tokenWXYZ"
