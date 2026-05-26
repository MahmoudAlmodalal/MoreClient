class TestGetSettings:
    async def test_authenticated_returns_200(self, client, auth_headers):
        resp = await client.get("/settings", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "tenant_key" in data
        assert "bot_name" in data
        assert "confidence_threshold" in data

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/settings")
        assert resp.status_code == 401


class TestPatchSettings:
    async def test_patch_bot_name(self, client, auth_headers):
        resp = await client.patch(
            "/settings",
            headers=auth_headers,
            json={"bot_name": "Helpy McHelpface"},
        )
        assert resp.status_code == 200
        assert resp.json()["bot_name"] == "Helpy McHelpface"

    async def test_patch_confidence_threshold(self, client, auth_headers):
        resp = await client.patch(
            "/settings",
            headers=auth_headers,
            json={"confidence_threshold": 0.75},
        )
        assert resp.status_code == 200
        assert resp.json()["confidence_threshold"] == 0.75

    async def test_patch_unauthenticated_returns_401(self, client):
        resp = await client.patch("/settings", json={"bot_name": "X"})
        assert resp.status_code == 401

    async def test_put_settings(self, client, auth_headers):
        resp = await client.put(
            "/settings",
            headers=auth_headers,
            json={"bot_name": "PutBot"},
        )
        assert resp.status_code == 200
        assert resp.json()["bot_name"] == "PutBot"
