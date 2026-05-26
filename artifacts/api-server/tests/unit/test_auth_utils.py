import time
import json
import base64

import pytest
from app.auth import hash_password, verify_password, sign_jwt, decode_jwt, verify_admin_key
from app.config import settings


class TestPassword:
    def test_hash_and_verify_success(self):
        hashed = hash_password("MySecret123!")
        assert verify_password("MySecret123!", hashed) is True

    def test_verify_wrong_password_returns_false(self):
        hashed = hash_password("CorrectHorse")
        assert verify_password("WrongHorse", hashed) is False

    def test_same_password_produces_different_hashes(self):
        h1 = hash_password("password")
        h2 = hash_password("password")
        assert h1 != h2  # bcrypt includes salt


class TestJwt:
    def test_sign_and_decode_round_trip(self):
        token = sign_jwt(sub=42, tid=7, tk="my-tenant", role="company")
        payload = decode_jwt(token)
        assert payload is not None
        assert payload["sub"] == 42
        assert payload["tid"] == 7
        assert payload["tk"] == "my-tenant"
        assert payload["role"] == "company"

    def test_decode_tampered_signature_returns_none(self):
        token = sign_jwt(sub=1, tid=1, tk="t", role="company")
        parts = token.split(".")
        # Flip last character of signature
        bad_sig = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
        bad_token = ".".join([parts[0], parts[1], bad_sig])
        assert decode_jwt(bad_token) is None

    def test_decode_expired_token_returns_none(self):
        import hmac as _hmac
        import hashlib

        def _b64url_encode(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

        header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
        payload = _b64url_encode(json.dumps({
            "sub": 1, "tid": 1, "tk": "t", "role": "company",
            "exp": int(time.time()) - 1,  # already expired
        }).encode())
        signing_input = f"{header}.{payload}"
        sig = _b64url_encode(
            _hmac.new(settings.jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        )
        expired_token = f"{signing_input}.{sig}"
        assert decode_jwt(expired_token) is None

    def test_decode_malformed_string_returns_none(self):
        assert decode_jwt("not.a.valid.jwt.string") is None
        assert decode_jwt("garbage") is None
        assert decode_jwt("") is None

    def test_admin_key_matches_settings(self):
        assert verify_admin_key(settings.admin_api_key) is True

    def test_admin_key_wrong_returns_false(self):
        assert verify_admin_key("definitely-wrong-key") is False
