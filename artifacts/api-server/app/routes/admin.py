import time
import psutil
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import verify_admin_key
from app.config import settings as cfg
from app.database import get_db, engine
from app.models import AuthUser, Conversation, Message, Settings, Tenant
from app.schemas import (
    AdminHealth, AdminKPIs, CreateTenantRequest, TenantOut, UpdateTenantRequest
)
from app.services.tenant import slugify_tenant_key
from app.services.serialize import iso

router = APIRouter(prefix="/admin")

PLAN_MRR = {"pro": 49, "ultra": 199, "custom": 0}


def _require_admin(x_admin_key: str = Header(...)):
    if not verify_admin_key(x_admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")


def _tenant_out(t: Tenant) -> TenantOut:
    return TenantOut(
        id=t.id,
        tenant_key=t.tenant_key,
        name=t.name,
        email=t.email,
        plan=t.plan,
        status=t.status,
        used_messages=t.used_messages,
        limit_messages=t.limit_messages,
        created_date=iso(t.created_at),
    )


@router.get("/tenants", response_model=list[TenantOut], dependencies=[Depends(_require_admin)])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    plan: str | None = Query(None),
    status: str | None = Query(None),
):
    q = select(Tenant)
    if search:
        q = q.where(Tenant.name.ilike(f"%{search}%") | Tenant.email.ilike(f"%{search}%"))
    if plan and plan != "all":
        q = q.where(Tenant.plan == plan)
    if status and status != "all":
        q = q.where(Tenant.status == status)
    q = q.order_by(Tenant.created_at.desc())
    result = await db.execute(q)
    return [_tenant_out(t) for t in result.scalars().all()]


@router.post("/tenants", response_model=TenantOut, dependencies=[Depends(_require_admin)])
async def create_tenant(body: CreateTenantRequest, db: AsyncSession = Depends(get_db)):
    tenant_key = body.tenant_key or slugify_tenant_key(body.name)
    t = Tenant(
        tenant_key=tenant_key,
        name=body.name,
        email=body.email,
        plan=body.plan,
        limit_messages=body.limit_messages,
    )
    db.add(t)
    await db.flush()
    db.add(Settings(tenant_id=t.id, company_name=body.name))
    await db.commit()
    await db.refresh(t)
    return _tenant_out(t)


@router.put("/tenants/{tenant_id}", response_model=TenantOut, dependencies=[Depends(_require_admin)])
async def update_tenant(tenant_id: int, body: UpdateTenantRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    await db.commit()
    await db.refresh(t)
    return _tenant_out(t)


@router.delete("/tenants/{tenant_id}", dependencies=[Depends(_require_admin)])
async def delete_tenant(tenant_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}


@router.post("/tenants/{tenant_id}/toggle", response_model=TenantOut, dependencies=[Depends(_require_admin)])
async def toggle_tenant(tenant_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    t.status = "inactive" if t.status == "active" else "active"
    await db.commit()
    await db.refresh(t)
    return _tenant_out(t)


@router.get("/kpis", response_model=AdminKPIs, dependencies=[Depends(_require_admin)])
async def admin_kpis(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(select(func.count(Tenant.id)))
    total = total_result.scalar_one() or 0

    active_result = await db.execute(select(func.count(Tenant.id)).where(Tenant.status == "active"))
    active = active_result.scalar_one() or 0

    plans_result = await db.execute(select(Tenant.plan, func.count(Tenant.id)).group_by(Tenant.plan))
    mrr = sum(PLAN_MRR.get(plan, 0) * count for plan, count in plans_result.all())

    conv_ids = select(Conversation.id)
    msg_result = await db.execute(select(func.count(Message.id)).where(Message.conversation_id.in_(conv_ids)))
    global_messages = msg_result.scalar_one() or 0

    return AdminKPIs(
        active_tenants=active,
        total_tenants=total,
        total_mrr=mrr,
        global_messages=global_messages,
    )


@router.get("/health", response_model=AdminHealth, dependencies=[Depends(_require_admin)])
async def admin_health(db: AsyncSession = Depends(get_db)):
    start = time.monotonic()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = (time.monotonic() - start) * 1000
    except Exception:
        db_latency = -1.0

    try:
        await db.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'"))
        chroma_status = "ok"
    except Exception:
        chroma_status = "unavailable"

    mem = psutil.virtual_memory()
    cpu = psutil.cpu_percent(interval=0.1)

    llm_status = "keyless"
    if cfg.openai_api_key and cfg.gemini_api_key:
        llm_status = "ok"
    elif cfg.openai_api_key or cfg.gemini_api_key:
        llm_status = "partial"

    return AdminHealth(
        db_latency_ms=round(db_latency, 2),
        chroma_status=chroma_status,
        memory_usage_percent=round(mem.percent, 1),
        cpu_usage_percent=round(cpu, 1),
        llm_provider_status=llm_status,
    )
