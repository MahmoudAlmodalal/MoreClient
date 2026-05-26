import re
import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Tenant, Settings


def slugify_tenant_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:32]
    return slug or f"tenant-{int(time.time())}"


async def find_tenant_by_key(db: AsyncSession, tenant_key: str) -> Tenant | None:
    result = await db.execute(select(Tenant).where(Tenant.tenant_key == tenant_key))
    return result.scalar_one_or_none()


async def get_settings(db: AsyncSession, tenant_id: int) -> Settings | None:
    result = await db.execute(select(Settings).where(Settings.tenant_id == tenant_id))
    return result.scalar_one_or_none()


async def ensure_settings(db: AsyncSession, tenant_id: int) -> Settings:
    s = await get_settings(db, tenant_id)
    if s:
        return s
    s = Settings(tenant_id=tenant_id)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s
