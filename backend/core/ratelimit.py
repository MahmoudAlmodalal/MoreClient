"""Per-IP rate limiting (slowapi).

In-process token-bucket limiting — sufficient for the current single-instance
Replit deployment. A default limit covers every route; hot/abuse-prone paths
(chat, upload) get tighter explicit limits via the ``limiter.limit`` decorator,
and provider webhooks / health probes are exempted so retries and uptime checks
are never throttled.

If the deployment ever scales horizontally, swap the in-memory storage for a
shared backend (e.g. Redis via ``storage_uri``); the per-route decorators stay
the same.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Default applies to all routes unless overridden by an explicit @limiter.limit.
# headers_enabled stays off: injecting X-RateLimit-* headers requires every
# limited endpoint to accept a `response: Response` param, which not all do.
# Limiting still returns 429 on exceed — the headers are purely informational.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
)

# Reusable per-route limits referenced from the routers.
CHAT_LIMIT = "30/minute"
UPLOAD_LIMIT = "10/minute"
