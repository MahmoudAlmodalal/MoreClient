"""
Global test configuration. Must be the first module loaded by pytest so that
env-var injection and monkey-patches happen before any app code is imported.
"""
import os
import sys
import types

# ── 1. Set env vars before any app import ────────────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")
os.environ.setdefault("OPENAI_API_KEY", "")
os.environ.setdefault("GEMINI_API_KEY", "")

# ── 2. Stub pgvector so models.py can load without the C extension ────────────
from sqlalchemy import Text as _SaText  # noqa: E402

_pv = types.ModuleType("pgvector")
_pvsa = types.ModuleType("pgvector.sqlalchemy")
_pvsa.Vector = lambda dim=1536: _SaText()
_pv.sqlalchemy = _pvsa
sys.modules.setdefault("pgvector", _pv)
sys.modules.setdefault("pgvector.sqlalchemy", _pvsa)

# ── 3. Map BigInteger → INTEGER for SQLite so PKs auto-increment correctly ─────
from sqlalchemy.dialects.sqlite import base as _sqlite_base  # noqa: E402

_sqlite_base.SQLiteTypeCompiler.visit_big_integer = lambda self, type_, **kw: "INTEGER"

# ── 5. Patch create_async_engine to accept SQLite URLs (strips QueuePool args) ─
import sqlalchemy.ext.asyncio as _sqla_async  # noqa: E402
from sqlalchemy.pool import StaticPool as _StaticPool  # noqa: E402

_orig_create_async_engine = _sqla_async.create_async_engine


def _sqlite_safe_create_async_engine(url, **kw):
    if "sqlite" in str(url):
        kw.pop("pool_size", None)
        kw.pop("max_overflow", None)
        kw.setdefault("poolclass", _StaticPool)
        kw.setdefault("connect_args", {"check_same_thread": False})
    return _orig_create_async_engine(url, **kw)


_sqla_async.create_async_engine = _sqlite_safe_create_async_engine

# ── 6. Now safe to import application code ────────────────────────────────────
import pytest  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession  # noqa: E402
import httpx  # noqa: E402

from main import app  # noqa: E402
from app.database import Base, get_db, engine  # noqa: E402
from app.auth import sign_jwt  # noqa: E402

_TestSessionFactory = async_sessionmaker(engine, expire_on_commit=False)

# ── 7. Create all tables once per test session ────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
async def _create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


# ── 8. Function-scoped DB session ─────────────────────────────────────────────
@pytest.fixture
async def db_session():
    async with _TestSessionFactory() as session:
        yield session


# ── 9. HTTP client with DB dependency overridden ─────────────────────────────
@pytest.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)


# ── 10. JWT auth headers fixture (pre-registered tenant, id=1) ───────────────
@pytest.fixture
def auth_headers():
    token = sign_jwt(sub=1, tid=1, tk="test-tenant", role="company")
    return {"Authorization": f"Bearer {token}"}
