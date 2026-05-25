"""Symmetric encryption for secrets stored at rest (Telegram / Twilio tokens).

Channel credentials live in the single-row ``Setting`` table in SQLite. Storing
them in plaintext means a leaked DB file leaks live bot/messaging credentials.
This module encrypts them with Fernet (AES-128-CBC + HMAC) using a key derived
from ``APP_SECRET``.

Design goals:
  * **Transparent migration** — ``decrypt`` passes through any value that is not
    one of our ciphertexts, so pre-existing plaintext rows keep working and get
    re-encrypted the next time they are saved.
  * **Keyless dev still boots** — with no ``APP_SECRET`` a fixed dev key is used
    (there are no real secrets to protect in keyless mode); a warning is logged.
  * **Masking** — ``mask`` renders a stored secret as ``••••1234`` for safe
    display in API responses, and ``is_masked`` detects that placeholder so a
    PUT that echoes it back never overwrites the real value.
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from backend.core.config import settings

logger = logging.getLogger(__name__)

# Tag prefix marking a value this module produced. Anything without it is treated
# as legacy plaintext and returned unchanged by ``decrypt``.
_PREFIX = "enc::"
_MASK_CHAR = "•"  # bullet •
# Dev fallback salt — only used when APP_SECRET is absent (keyless dev mode).
_DEV_FALLBACK = "clientmore-dev-insecure-key"


def _fernet() -> Fernet:
    secret = settings.APP_SECRET
    if not secret:
        if not settings.is_dev:
            # Should never reach here: prod boot validation requires APP_SECRET.
            raise RuntimeError("APP_SECRET is required to encrypt secrets in production")
        logger.warning(
            "APP_SECRET unset — encrypting at-rest secrets with an insecure dev key. "
            "Set APP_SECRET before storing real channel credentials."
        )
        secret = _DEV_FALLBACK
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def encrypt(plaintext: str | None) -> str | None:
    """Encrypt a secret for storage. Returns None/empty unchanged."""
    if not plaintext:
        return plaintext
    token = _fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")
    return _PREFIX + token


def decrypt(stored: str | None) -> str | None:
    """Decrypt a stored secret. Legacy plaintext (no prefix) passes through."""
    if not stored or not stored.startswith(_PREFIX):
        return stored  # legacy plaintext or empty
    try:
        return _fernet().decrypt(stored[len(_PREFIX):].encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        logger.error("Failed to decrypt a stored secret (wrong APP_SECRET?).")
        return None


def mask(stored: str | None) -> str | None:
    """Render a stored secret for display: ••••1234. None/empty stay None."""
    plain = decrypt(stored)
    if not plain:
        return None
    tail = plain[-4:] if len(plain) >= 4 else plain
    return _MASK_CHAR * 4 + tail


def is_masked(value: str | None) -> bool:
    """True if a value looks like a mask placeholder (so PUT should ignore it)."""
    return bool(value) and value.startswith(_MASK_CHAR)
