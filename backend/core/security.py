"""Admin access control.

There is no full login/session system yet (that is a later roadmap item). Until
then, every privileged /api/admin/* route is guarded by a single shared secret —
``ADMIN_API_KEY`` — supplied by the operator and presented by the admin console.

Policy (fail-closed):
  * A request is authorised only if it carries the exact key via
    ``Authorization: Bearer <key>`` or the ``X-Admin-Key`` header (constant-time
    compared).
  * If ``ADMIN_API_KEY`` is unset, all admin access is **denied** — unless the
    operator explicitly opted into insecure admin in a dev environment
    (``ENV=dev`` and ``ALLOW_INSECURE_ADMIN=1``), which preserves the keyless demo.
"""

import hmac
import logging
from datetime import datetime, timedelta

import jwt
from passlib.context import CryptContext
from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer

from backend.core.config import settings
from backend.schemas.auth import TokenPayload

logger = logging.getLogger(__name__)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="admin authorization required",
    headers={"WWW-Authenticate": "Bearer"},
)


def _extract_key(authorization: str | None, x_admin_key: str | None) -> str | None:
    """Pull the presented key from either supported header."""
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return token.strip()
    if x_admin_key:
        return x_admin_key.strip()
    return None


def require_admin(
    authorization: str | None = Header(default=None),
    x_admin_key: str | None = Header(default=None),
) -> None:
    """FastAPI dependency: authorise an admin request or raise 401.

    Wired as a router-level dependency in main.py so it covers every admin route
    (including /api/admin/health) without per-handler boilerplate.
    """
    presented = _extract_key(authorization, x_admin_key)

    # 1. If Bearer token looks like JWT (has 2 dots): decode it, check role == "admin"
    if presented and presented.count(".") == 2:
        try:
            payload = decode_access_token(presented)
            if payload.role == "admin":
                return
        except Exception:
            pass

    configured = settings.ADMIN_API_KEY

    if not configured:
        if settings.admin_insecure_allowed:
            logger.warning(
                "ADMIN_API_KEY unset — admin endpoints are UNAUTHENTICATED "
                "(ALLOW_INSECURE_ADMIN=1 in dev). Do NOT use this in production."
            )
            return
        logger.warning("Admin access denied: ADMIN_API_KEY is not configured.")
        raise _UNAUTHORIZED

    if not presented or not hmac.compare_digest(presented, configured):
        raise _UNAUTHORIZED


# Convenience export for `dependencies=[admin_guard]` router includes.
admin_guard = Depends(require_admin)

# --- JWT Auth additions ---

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_DAYS = 7
_DEV_JWT_SECRET = "clientmore-development-only-secret"


def _jwt_secret() -> str:
    """Return the configured signing secret, with a development-only fallback.

    Production continues to fail closed when APP_SECRET is absent. The fallback
    exists solely so the documented local frontend/backend flow can create a
    browser session without requiring a manually supplied secret.
    """
    if settings.APP_SECRET:
        return settings.APP_SECRET
    if settings.is_dev:
        return _DEV_JWT_SECRET
    raise RuntimeError("Cannot sign or decode JWT: APP_SECRET is unset")


def create_access_token(user_id: int, email: str, role: str, tenant_key: str | None) -> str:
    secret = _jwt_secret()
    expire = datetime.utcnow() + timedelta(days=_JWT_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "tenant_key": tenant_key,
        "iat": int(datetime.utcnow().timestamp()),
        "exp": int(expire.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=_JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> TokenPayload:
    payload = jwt.decode(token, _jwt_secret(), algorithms=[_JWT_ALGORITHM])
    return TokenPayload(**payload)


_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str | None = Depends(_oauth2_scheme)) -> TokenPayload:
    if settings.is_dev and not settings.APP_SECRET:
        return TokenPayload(sub="1", email="dev@example.com", role="admin", tenant_key=None, iat=0, exp=0)

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        
    try:
        return decode_access_token(token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_company(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role not in {"company", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return user


def require_admin_jwt(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return user


def get_tenant_key(
    user: TokenPayload = Depends(get_current_user),
    tenant_key_q: str | None = Query(default=None, alias="tenant_key"),
) -> str | None:
    if user.role == "admin":
        return None
    if user.role == "company":
        return user.tenant_key
    if settings.is_dev and not settings.APP_SECRET:
        return tenant_key_q or settings.DEFAULT_TENANT_KEY
    return None


company_guard = Depends(require_company)
