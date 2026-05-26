"""Shared helpers for E2E journey tests.

Each journey test uses a unique email suffix so tenants never collide,
and multi-tenant scoping in the app ensures journey A's data is invisible
to journey B without explicit cleanup.
"""
import uuid


def unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


async def register_tenant(client, suffix: str | None = None) -> dict:
    """Register a fresh tenant and return the full AuthResponse dict."""
    s = suffix or unique_suffix()
    resp = await client.post("/auth/register", json={
        "email": f"e2e-{s}@example.com",
        "password": "E2ePassword1!",
        "name": f"E2E User {s}",
        "company_name": f"E2E Corp {s}",
    })
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    return resp.json()


def auth(reg: dict) -> dict:
    """Return Authorization headers from a registration response."""
    return {"Authorization": f"Bearer {reg['token']}"}
