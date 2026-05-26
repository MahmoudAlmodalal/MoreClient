import pytest

_REGISTER_PAYLOAD = {
    "email": "alice@example.com",
    "password": "AlicePass1!",
    "name": "Alice",
    "company_name": "Alice Corp",
}


class TestRegister:
    async def test_new_user_returns_200_with_token(self, client):
        resp = await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["email"] == "alice@example.com"
        assert data["redirect_to"] == "/dashboard"
        assert "tenant_key" in data

    async def test_duplicate_email_returns_400(self, client):
        await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        resp = await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        assert resp.status_code == 400

    async def test_company_name_used_as_tenant_key_base(self, client):
        resp = await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        data = resp.json()
        assert "alice-corp" in data["tenant_key"]


class TestLogin:
    async def test_correct_credentials_returns_token(self, client):
        await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        resp = await client.post("/auth/login", json={
            "email": "alice@example.com",
            "password": "AlicePass1!",
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    async def test_wrong_password_returns_401(self, client):
        await client.post("/auth/register", json=_REGISTER_PAYLOAD)
        resp = await client.post("/auth/login", json={
            "email": "alice@example.com",
            "password": "WrongPass!",
        })
        assert resp.status_code == 401

    async def test_unknown_email_returns_401(self, client):
        resp = await client.post("/auth/login", json={
            "email": "ghost@example.com",
            "password": "anything",
        })
        assert resp.status_code == 401


class TestMe:
    async def test_authenticated_returns_200(self, client, auth_headers):
        resp = await client.get("/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "company"
        assert data["tenant_key"]  # non-empty

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/auth/me")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401(self, client):
        resp = await client.get("/auth/me", headers={"Authorization": "Bearer bad.token.here"})
        assert resp.status_code == 401


class TestRefreshAndLogout:
    async def test_refresh_returns_new_token(self, client, auth_headers):
        resp = await client.post("/auth/refresh", headers=auth_headers)
        assert resp.status_code == 200
        assert "token" in resp.json()

    async def test_logout_returns_ok(self, client):
        resp = await client.post("/auth/logout")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


class TestDemoLogin:
    async def test_returns_404_when_demo_user_missing(self, client):
        resp = await client.post("/auth/demo-login")
        assert resp.status_code == 404

    async def test_returns_404_when_demo_user_has_orphaned_tenant(self, client, db_session):
        # Pin bug #1: demo-login used to crash with AttributeError when the
        # demo user's tenant_id pointed at a non-existent row.
        from app.models import AuthUser
        from app.auth import hash_password
        db_session.add(AuthUser(
            tenant_id=99999,  # no tenant with this id exists
            email="demo@example.com",
            password_hash=hash_password("anything"),
            name="Demo",
            role="company",
        ))
        await db_session.commit()
        resp = await client.post("/auth/demo-login")
        assert resp.status_code == 404
        assert "tenant" in resp.json().get("detail", "").lower()
