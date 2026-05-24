"""Admin tenant management schemas — CRUD + KPIs + system health.

The frontend speaks camelCase; we use alias_generator=to_camel so attribute
names stay snake_case (matching ORM columns) while the JSON contract is camel.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Tenant CRUD ──────────────────────────────────────────────────────────────

class TenantOut(_CamelModel):
    id: int
    tenant_key: str
    name: str
    email: str
    plan: str
    status: str
    used_messages: int
    limit_messages: int
    created_date: str  # ISO date string, formatted from created_at


class TenantCreate(_CamelModel):
    name: str
    email: str
    plan: str = "pro"
    limit_messages: int = 500
    tenant_key: str | None = None


class TenantUpdate(_CamelModel):
    """All fields optional — PUT performs a partial update."""
    name: str | None = None
    email: str | None = None
    plan: str | None = None
    limit_messages: int | None = None


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
