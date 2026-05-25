"""At-rest secret encryption + masking (backend/core/crypto.py)."""

from backend.core import crypto
from backend.core.config import settings


def test_round_trip(monkeypatch):
    monkeypatch.setattr(settings, "APP_SECRET", "test-secret")
    enc = crypto.encrypt("123456:ABCdefGHI")
    assert enc.startswith("enc::")
    assert enc != "123456:ABCdefGHI"
    assert crypto.decrypt(enc) == "123456:ABCdefGHI"


def test_legacy_plaintext_passthrough(monkeypatch):
    """Pre-existing plaintext rows (no prefix) decrypt to themselves."""
    monkeypatch.setattr(settings, "APP_SECRET", "test-secret")
    assert crypto.decrypt("legacy-plaintext-token") == "legacy-plaintext-token"


def test_none_and_empty(monkeypatch):
    monkeypatch.setattr(settings, "APP_SECRET", "test-secret")
    assert crypto.encrypt(None) is None
    assert crypto.encrypt("") == ""
    assert crypto.decrypt(None) is None


def test_mask_and_is_masked(monkeypatch):
    monkeypatch.setattr(settings, "APP_SECRET", "test-secret")
    enc = crypto.encrypt("supersecrettoken1234")
    masked = crypto.mask(enc)
    assert masked == "••••1234"
    assert crypto.is_masked(masked)
    assert not crypto.is_masked("plain-value")
    assert crypto.mask(None) is None


def test_different_secret_cannot_decrypt(monkeypatch):
    monkeypatch.setattr(settings, "APP_SECRET", "secret-a")
    enc = crypto.encrypt("token")
    monkeypatch.setattr(settings, "APP_SECRET", "secret-b")
    # Wrong key → decrypt fails gracefully to None (logged), not a crash.
    assert crypto.decrypt(enc) is None
