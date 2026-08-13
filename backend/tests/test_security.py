"""Admin auth guard (backend/core/security.py)."""

import pytest
from fastapi import HTTPException

from backend.core.config import settings
from backend.core.security import require_admin


def test_denies_without_key_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "secret")
    with pytest.raises(HTTPException) as exc:
        require_admin(authorization=None, x_admin_key=None)
    assert exc.value.status_code == 401


def test_allows_bearer(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "secret")
    assert require_admin(authorization="Bearer secret", x_admin_key=None) is None


def test_allows_x_admin_key_header(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "secret")
    assert require_admin(authorization=None, x_admin_key="secret") is None


def test_explicit_admin_key_wins_over_company_bearer_token(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "secret")
    assert require_admin(authorization="Bearer company-session-token", x_admin_key="secret") is None


def test_rejects_wrong_key(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "secret")
    with pytest.raises(HTTPException):
        require_admin(authorization="Bearer nope", x_admin_key=None)


def test_denied_when_unset_and_not_insecure(monkeypatch):
    """Fail-closed: no key + not explicitly insecure → 401."""
    monkeypatch.setattr(settings, "ADMIN_API_KEY", None)
    monkeypatch.setattr(settings, "ENV", "prod")
    monkeypatch.setattr(settings, "ALLOW_INSECURE_ADMIN", False)
    with pytest.raises(HTTPException):
        require_admin(authorization=None, x_admin_key=None)


def test_open_only_in_dev_insecure(monkeypatch):
    """Keyless demo escape hatch: dev + ALLOW_INSECURE_ADMIN + no key → allowed."""
    monkeypatch.setattr(settings, "ADMIN_API_KEY", None)
    monkeypatch.setattr(settings, "ENV", "dev")
    monkeypatch.setattr(settings, "ALLOW_INSECURE_ADMIN", True)
    assert require_admin(authorization=None, x_admin_key=None) is None
