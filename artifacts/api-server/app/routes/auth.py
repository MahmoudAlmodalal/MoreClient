from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password, verify_password, sign_jwt, get_current_user
from app.database import get_db
from app.models import AuthUser, Tenant, Settings
from app.schemas import (
    RegisterRequest, LoginRequest, AuthResponse, MeResponse, RefreshResponse
)
from app.services.tenant import slugify_tenant_key

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(AuthUser).where(AuthUser.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_key = slugify_tenant_key(body.company_name or body.email.split("@")[0])
    # Ensure unique key
    base_key = tenant_key
    suffix = 0
    while True:
        r = await db.execute(select(Tenant).where(Tenant.tenant_key == tenant_key))
        if not r.scalar_one_or_none():
            break
        suffix += 1
        tenant_key = f"{base_key}-{suffix}"

    tenant = Tenant(tenant_key=tenant_key, name=body.company_name or body.email, email=body.email)
    db.add(tenant)
    await db.flush()

    s = Settings(tenant_id=tenant.id, company_name=body.company_name)
    db.add(s)

    user = AuthUser(
        tenant_id=tenant.id,
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role="company",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await db.refresh(tenant)

    token = sign_jwt(user.id, tenant.id, tenant.tenant_key, user.role)
    return AuthResponse(
        token=token,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        redirect_to="/dashboard",
        tenant_key=tenant.tenant_key,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuthUser).where(AuthUser.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant not found")

    token = sign_jwt(user.id, tenant.id, tenant.tenant_key, user.role)
    return AuthResponse(
        token=token,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        redirect_to="/dashboard",
        tenant_key=tenant.tenant_key,
    )


@router.post("/demo-login", response_model=AuthResponse)
async def demo_login(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuthUser).where(AuthUser.email == "demo@example.com"))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not available")
    result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Demo tenant not available")
    token = sign_jwt(user.id, tenant.id, tenant.tenant_key, user.role)
    return AuthResponse(
        token=token, user_id=user.id, email=user.email, name=user.name,
        role=user.role, redirect_to="/dashboard", tenant_key=tenant.tenant_key,
    )


@router.get("/me", response_model=MeResponse)
async def me(auth: Annotated[dict, Depends(get_current_user)], db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuthUser).where(AuthUser.id == auth["sub"]))
    user = result.scalar_one_or_none()
    return MeResponse(
        user_id=auth["sub"],
        email=user.email if user else "",
        name=user.name if user else None,
        role=auth["role"],
        tenant_key=auth["tk"],
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(auth: Annotated[dict, Depends(get_current_user)]):
    token = sign_jwt(auth["sub"], auth["tid"], auth["tk"], auth["role"])
    return RefreshResponse(token=token)


@router.post("/logout")
async def logout():
    return {"ok": True}
