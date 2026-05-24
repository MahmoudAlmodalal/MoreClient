"""Admin tenant management schemas — CRUD + KPIs + system health.

The frontend speaks camelCase; we use alias_generator=to_camel so attribute
names stay snake_case (matching ORM columns) while the JSON contract is camel.
"""

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

# Pragmatic email check — avoids adding the optional `email-validator` dependency
# (keeps the keyless/offline boot dependency-free) while rejecting obvious garbage.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ALLOWED_PLANS = {"pro", "ultra", "custom"}


def _validate_email(v: str | None) -> str | None:
    if v is not None and not _EMAIL_RE.match(v):
        raise ValueError("invalid email address")
    return v


def _validate_plan(v: str | None) -> str | None:
    if v is not None and v not in _ALLOWED_PLANS:
        raise ValueError("plan must be one of: pro, ultra, custom")
    return v


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Tenant CRUD ──────────────────────────────────────────────────────────────

class TenantOut(_CamelModel):
    id: int
    name: str
    email: str
    plan: str
    status: str
    used_messages: int
    limit_messages: int
    created_date: str  # ISO date string, formatted from created_at


class TenantCreate(_CamelModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., max_length=255)
    plan: str = "pro"
    limit_messages: int = Field(default=500, ge=0, le=10_000_000)

    _check_email = field_validator("email")(_validate_email)
    _check_plan = field_validator("plan")(_validate_plan)


class TenantUpdate(_CamelModel):
    """All fields optional — PUT performs a partial update."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    plan: str | None = None
    limit_messages: int | None = Field(default=None, ge=0, le=10_000_000)

    _check_email = field_validator("email")(_validate_email)
    _check_plan = field_validator("plan")(_validate_plan)


# ── Admin KPIs ───────────────────────────────────────────────────────────────

class AdminKpis(_CamelModel):
    active_tenants: int
    total_tenants: int
    total_mrr: int
    global_messages: int


# ── System Health ────────────────────────────────────────────────────────────

class AdminHealth(_CamelModel):
    db_latency_ms: float
    chroma_status: str
    memory_usage_percent: float
    cpu_usage_percent: float
    llm_provider_status: str
