import pytest


class TestListHandoffs:
    async def test_empty_list_when_no_handoffs(self, client, auth_headers):
        resp = await client.get("/handoffs", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/handoffs")
        assert resp.status_code == 401


class TestResolveHandoff:
    async def test_resolve_nonexistent_returns_404(self, client, auth_headers):
        resp = await client.post("/handoffs/99999/resolve", headers=auth_headers)
        assert resp.status_code == 404


class TestBulkDelete:
    async def test_delete_empty_ids_returns_zero(self, client, auth_headers):
        resp = await client.request(
            "DELETE",
            "/handoffs",
            headers=auth_headers,
            json={"ids": []},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 0

    async def test_delete_foreign_handoff_returns_403(self, client, auth_headers):
        resp = await client.request(
            "DELETE",
            "/handoffs",
            headers=auth_headers,
            json={"ids": [99999]},
        )
        assert resp.status_code == 403
