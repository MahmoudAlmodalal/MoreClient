"""Feature-test fixtures: per-test table cleanup and a registered user."""
import pytest
from sqlalchemy import delete

from app.database import engine
from app.models import (
    LearnedAnswer, Handoff, Message, Conversation,
    DocumentChunk, Document, Settings, AuthUser, Tenant,
)
from app.auth import sign_jwt


_CLEANUP_ORDER = [
    LearnedAnswer, Handoff, Message, Conversation,
    DocumentChunk, Document, Settings, AuthUser, Tenant,
]


@pytest.fixture(autouse=True)
async def _clean_tables():
    """Wipe all rows after every feature test for isolation."""
    yield
    from sqlalchemy.ext.asyncio import async_sessionmaker
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        for model in _CLEANUP_ORDER:
            await session.execute(delete(model))
        await session.commit()


@pytest.fixture
async def registered_user(client):
    """Register a fresh test user and return the AuthResponse dict."""
    resp = await client.post("/auth/register", json={
        "email": "fixture@example.com",
        "password": "FixturePass1!",
        "name": "Fixture User",
        "company_name": "Fixture Co",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}"}
