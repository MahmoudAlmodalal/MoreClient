"""Admin tenant management endpoints.

Provides CRUD for the tenant subscription registry, platform-wide KPIs,
and basic system health probing. No real authentication yet — access control
is enforced client-side via sessionStorage role check (P1 roadmap item).
"""

import os
import time

import psutil
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.core.config import settings as app_settings
from backend.models.database import get_db, engine
from backend.models.tables import Message, Tenant
from backend.schemas.tenants import (
    AdminHealth,
    AdminKpis,
    TenantCreate,
    TenantOut,
    TenantUpdate,
)

router = APIRouter()

# Plan → monthly price mapping for MRR calculation.
_PLAN_PRICE = {"pro": 500, "ultra": 1500, "custom": 3000}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _tenant_to_out(t: Tenant) -> TenantOut:
    """Convert an ORM Tenant row to the API response schema."""
    return TenantOut(
        id=t.id,
        name=t.name,
        email=t.email,
        plan=t.plan,
        status=t.status,
        used_messages=t.used_messages,
        limit_messages=t.limit_messages,
        created_date=t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
    )


# ── Tenant CRUD ──────────────────────────────────────────────────────────────

@router.get("/api/admin/tenants", response_model=list[TenantOut])
def list_tenants(
    search: str = Query("", description="Search name or email"),
    plan: str = Query("all", description="Filter by plan: all|pro|ultra|custom"),
    status: str = Query("all", description="Filter by status: all|active|inactive"),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[TenantOut]:
    q = select(Tenant)

    if search:
        pattern = f"%{search}%"
        q = q.where(Tenant.name.ilike(pattern) | Tenant.email.ilike(pattern))

    if plan != "all":
        q = q.where(Tenant.plan == plan)

    if status != "all":
        q = q.where(Tenant.status == status)

    q = q.order_by(Tenant.created_at.desc()).offset(offset).limit(limit)
    tenants = db.execute(q).scalars().all()
    return [_tenant_to_out(t) for t in tenants]


@router.post("/api/admin/tenants", response_model=TenantOut, status_code=201)
def create_tenant(
    payload: TenantCreate, db: Session = Depends(get_db)
) -> TenantOut:
    # Check for duplicate email
    existing = db.execute(
        select(Tenant).where(Tenant.email == payload.email)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A tenant with this email already exists.")

    tenant = Tenant(
        name=payload.name,
        email=payload.email,
        plan=payload.plan,
        limit_messages=payload.limit_messages,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return _tenant_to_out(tenant)


@router.put("/api/admin/tenants/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int, payload: TenantUpdate, db: Session = Depends(get_db)
) -> TenantOut:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    incoming = payload.model_dump(exclude_unset=True, by_alias=False)
    for key, value in incoming.items():
        if hasattr(tenant, key):
            setattr(tenant, key, value)

    db.commit()
    db.refresh(tenant)
    return _tenant_to_out(tenant)


@router.delete("/api/admin/tenants/{tenant_id}")
def delete_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    db.delete(tenant)
    db.commit()
    return {"ok": True}


@router.post("/api/admin/tenants/{tenant_id}/toggle", response_model=TenantOut)
def toggle_tenant(tenant_id: int, db: Session = Depends(get_db)) -> TenantOut:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    tenant.status = "inactive" if tenant.status == "active" else "active"
    db.commit()
    db.refresh(tenant)
    return _tenant_to_out(tenant)


# ── Admin KPIs ───────────────────────────────────────────────────────────────

@router.get("/api/admin/kpis", response_model=AdminKpis)
def get_admin_kpis(db: Session = Depends(get_db)) -> AdminKpis:
    tenants = db.execute(select(Tenant)).scalars().all()

    active = [t for t in tenants if t.status == "active"]
    total_mrr = sum(_PLAN_PRICE.get(t.plan, 0) for t in active)
    global_messages = sum(t.used_messages for t in tenants)

    return AdminKpis(
        active_tenants=len(active),
        total_tenants=len(tenants),
        total_mrr=total_mrr,
        global_messages=global_messages,
    )


# ── System Health ────────────────────────────────────────────────────────────

@router.get("/api/admin/health", response_model=AdminHealth)
def get_admin_health() -> AdminHealth:
    # Measure real DB ping latency
    t0 = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(select(func.count()).select_from(Tenant))
        db_latency = round((time.time() - t0) * 1000, 1)
    except Exception:
        db_latency = -1.0

    # Check ChromaDB status
    try:
        from backend.services.ai import vectorstore
        col = vectorstore.get_collection()
        chroma_status = "healthy"
    except Exception:
        chroma_status = "unreachable"

    # Process-level resource usage via psutil
    process = psutil.Process(os.getpid())
    mem_percent = round(process.memory_percent(), 1)
    cpu_percent = round(psutil.cpu_percent(interval=0.1), 1)

    # LLM provider: check if key is configured
    llm_status = "configured" if app_settings.has_openai else "not_configured"

    return AdminHealth(
        db_latency_ms=db_latency,
        chroma_status=chroma_status,
        memory_usage_percent=mem_percent,
        cpu_usage_percent=cpu_percent,
        llm_provider_status=llm_status,
    )
