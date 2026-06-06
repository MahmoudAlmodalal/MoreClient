"""POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/social/start, POST /api/auth/social/callback"""

import re
from datetime import datetime
import httpx
import jwt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import AuthUser, Tenant
from backend.schemas.auth import (
    AuthSessionOut,
    LoginIn,
    RegisterIn,
    TokenPayload,
    SocialAuthStartIn,
    SocialAuthStartOut,
    SocialAuthCallbackIn,
)
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


@router.post("/api/auth/social/start", response_model=SocialAuthStartOut)
def social_auth_start(body: SocialAuthStartIn):
    provider = body.provider
    mode = body.mode
    
    # State parameter to pass provider and mode back
    state = f"{provider}:{mode}"
    
    redirect_uri = f"{settings.FRONTEND_URL}/auth/callback"
    
    if provider == "google":
        if settings.GOOGLE_CLIENT_ID:
            auth_url = (
                f"https://accounts.google.com/o/oauth2/v2/auth?"
                f"client_id={settings.GOOGLE_CLIENT_ID}&"
                f"redirect_uri={redirect_uri}&"
                f"response_type=code&"
                f"scope=openid+email+profile&"
                f"state={state}&"
                f"access_type=offline&"
                f"prompt=consent"
            )
        else:
            # Fallback to mock dev authentication
            auth_url = f"{redirect_uri}?code=mock_google_code&state={state}"
            
    elif provider == "apple":
        if settings.APPLE_CLIENT_ID:
            auth_url = (
                f"https://appleid.apple.com/auth/authorize?"
                f"client_id={settings.APPLE_CLIENT_ID}&"
                f"redirect_uri={redirect_uri}&"
                f"response_type=code&"
                f"scope=name+email&"
                f"response_mode=query&"
                f"state={state}"
            )
        else:
            # Fallback to mock dev authentication
            auth_url = f"{redirect_uri}?code=mock_apple_code&state={state}"
    else:
        raise HTTPException(status_code=400, detail="Invalid provider")
        
    return SocialAuthStartOut(provider=provider, authUrl=auth_url)


@router.post("/api/auth/social/callback", response_model=AuthSessionOut)
def social_auth_callback(body: SocialAuthCallbackIn, db: Session = Depends(get_db)):
    code = body.code
    state = body.state
    
    # Parse state
    try:
        parts = state.split(":")
        provider = parts[0]
        mode = parts[1] if len(parts) > 1 else "login"
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
        
    email = None
    name = None
    provider_subject = None
    
    # 1. Handle mock code
    if code.startswith("mock_"):
        email = f"mock.{provider}@example.com"
        name = f"Mock {provider.title()} User"
        provider_subject = f"mock-{provider}-sub"
    else:
        # Real OAuth code exchange
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback"
        if provider == "google":
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                raise HTTPException(status_code=500, detail="Google OAuth is not configured on backend")
            
            # Exchange code for tokens
            try:
                with httpx.Client() as client:
                    token_res = client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": code,
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "redirect_uri": redirect_uri,
                            "grant_type": "authorization_code",
                        }
                    )
                    token_res.raise_for_status()
                    token_data = token_res.json()
                    id_token = token_data.get("id_token")
                    
                    if not id_token:
                        raise HTTPException(status_code=400, detail="No id_token returned by Google")
                        
                    # Decode id_token JWT
                    decoded = jwt.decode(id_token, options={"verify_signature": False})
                    email = decoded.get("email")
                    name = decoded.get("name")
                    provider_subject = decoded.get("sub")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Google token exchange failed: {str(e)}")
                
        elif provider == "apple":
            if not settings.APPLE_CLIENT_ID or not settings.APPLE_CLIENT_SECRET:
                raise HTTPException(status_code=500, detail="Apple OAuth is not configured on backend")
                
            try:
                with httpx.Client() as client:
                    token_res = client.post(
                        "https://appleid.apple.com/auth/token",
                        data={
                            "code": code,
                            "client_id": settings.APPLE_CLIENT_ID,
                            "client_secret": settings.APPLE_CLIENT_SECRET,
                            "redirect_uri": redirect_uri,
                            "grant_type": "authorization_code",
                        }
                    )
                    token_res.raise_for_status()
                    token_data = token_res.json()
                    id_token = token_data.get("id_token")
                    
                    if not id_token:
                        raise HTTPException(status_code=400, detail="No id_token returned by Apple")
                        
                    decoded = jwt.decode(id_token, options={"verify_signature": False})
                    email = decoded.get("email")
                    name = decoded.get("name") or (email.split("@")[0] if email else "Apple User")
                    provider_subject = decoded.get("sub")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Apple token exchange failed: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")
            
    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from provider")
        
    # 2. Check if user already exists
    user = db.query(AuthUser).filter(AuthUser.email == email).first()
    
    if not user:
        # Auto-signup / register flow
        company_name = f"{name or email.split('@')[0]}'s Company"
        base_slug = _slugify(company_name)
        tenant_key = base_slug
        counter = 1
        while db.query(Tenant).filter(Tenant.tenant_key == tenant_key).first():
            tenant_key = f"{base_slug}-{counter}"
            counter += 1
            
        # Create Tenant and AuthUser atomically
        tenant = Tenant(
            tenant_key=tenant_key,
            name=company_name,
            email=email,
            plan="pro"
        )
        db.add(tenant)
        
        user = AuthUser(
            email=email,
            name=name or email.split("@")[0],
            provider=provider,
            provider_subject=provider_subject,
            role="company",
            tenant_key=tenant_key
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user's provider info if logging in for the first time with social
        if user.provider == "password" or not user.provider:
            user.provider = provider
            user.provider_subject = provider_subject
            db.commit()
            db.refresh(user)
            
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
