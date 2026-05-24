"""Structured JSON logging + request correlation.

Replaces the printf ``basicConfig`` with single-line JSON records so logs are
machine-parseable for aggregation/alerting in production. Every record carries a
``request_id`` (from the ``X-Request-ID`` header, or a generated UUID) so all log
lines for one request can be correlated — important for security forensics.

Dependency-free: standard-library ``logging`` + ``contextvars`` only.
"""

import json
import logging
import sys
import uuid
from contextvars import ContextVar

# Holds the current request's correlation id for the duration of the request.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

_RESERVED = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
) | {"taskName", "message", "asctime"}


class JsonFormatter(logging.Formatter):
    """Render log records as compact JSON, one object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Surface any structured extras passed via logger(..., extra={...}).
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload.setdefault(key, value)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    """Install the JSON handler on the root logger (idempotent)."""
    root = logging.getLogger()
    root.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    # Replace any pre-existing handlers (e.g. a stray basicConfig) so output
    # is exclusively structured JSON.
    root.handlers = [handler]


class RequestContextMiddleware:
    """Assign/propagate a per-request correlation id and echo it back.

    Implemented as pure ASGI (not BaseHTTPMiddleware) so the contextvar is set
    in the *same* async context as the downstream app — this is what lets the id
    reach handler log records (BaseHTTPMiddleware runs the app in a separate
    context where the contextvar would not propagate). The context also copies
    into run_in_threadpool workers, so sync handlers log the id too.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming = headers.get(b"x-request-id")
        rid = incoming.decode("latin-1") if incoming else uuid.uuid4().hex
        token = request_id_ctx.set(rid)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                message["headers"].append((b"x-request-id", rid.encode("latin-1")))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            request_id_ctx.reset(token)
