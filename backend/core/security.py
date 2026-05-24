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

from fastapi import Depends, Header, HTTPException, status

from backend.core.config import settings

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

    presented = _extract_key(authorization, x_admin_key)
    if not presented or not hmac.compare_digest(presented, configured):
        raise _UNAUTHORIZED


# Convenience export for `dependencies=[admin_guard]` router includes.
admin_guard = Depends(require_admin)
