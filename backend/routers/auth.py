"""POST /api/auth/login, POST /api/auth/register, GET /api/auth/me"""

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import AuthUser, Tenant
from backend.schemas.auth import AuthSessionOut, LoginIn, RegisterIn, TokenPayload
from backend.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.core.config import settings

router = APIRouter()

def _slugify(name: str) -> str:
    """Generate a simple tenant_key slug from a company name."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "tenant"

@router.post("/api/auth/login", response_model=AuthSessionOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        tenant_key=user.tenant_key
    )

    redirect_to = "/admin" if user.role == "admin" else "/dashboard"

    return AuthSessionOut(
        token=token,
        userId=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        redirectTo=redirect_to,
        tenantKey=user.tenant_key
    )

@router.post("/api/auth/register", response_model=AuthSessionOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    # 1. Check duplicate email
    existing_user = db.query(AuthUser).filter(AuthUser.email == body.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    
    # 2. Generate slug and ensure tenant doesn't conflict
    base_slug = _slugify(body.company_name)
    tenant_key = base_slug
    counter = 1
    while db.query(Tenant).filter(Tenant.tenant_key == tenant_key).first():
        tenant_key = f"{base_slug}-{counter}"
        counter += 1

    # 3. Create Tenant and AuthUser atomically
    tenant = Tenant(
        tenant_key=tenant_key,
        name=body.company_name,
        email=body.email,
        plan="pro"
    )
    db.add(tenant)
    
    user = AuthUser(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role="company",
        tenant_key=tenant_key
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        tenant_key=user.tenant_key
    )

    return AuthSessionOut(
        token=token,
        userId=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        redirectTo="/dashboard",
        tenantKey=user.tenant_key
    )

@router.get("/api/auth/me", response_model=TokenPayload)
def get_me(user: TokenPayload = Depends(get_current_user)):
    return user

# --- Seed First Admin Note ---
# To seed the first admin user, run this in a python shell:
# 
# from backend.models.database import SessionLocal
# from backend.models.tables import AuthUser
# from backend.core.security import hash_password
# db = SessionLocal()
# db.add(AuthUser(email='admin@example.com', name='Admin', password_hash=hash_password('changeme'), role='admin'))
# db.commit()
# print('Admin created')
