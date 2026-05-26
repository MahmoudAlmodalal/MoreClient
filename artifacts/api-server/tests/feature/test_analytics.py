import pytest


class TestAnalyticsEndpoint:
    async def test_returns_200_with_required_keys(self, client, auth_headers):
        resp = await client.get("/analytics", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "kpis" in data
        assert "top_questions" in data
        assert "channel_distribution" in data
        assert "unanswered" in data

    async def test_kpis_have_correct_fields(self, client, auth_headers):
        resp = await client.get("/analytics", headers=auth_headers)
        kpis = resp.json()["kpis"]
        assert "total_questions" in kpis
        assert "deflection_rate" in kpis
        assert "cost_savings" in kpis
        assert "feedback_score" in kpis

    async def test_baseline_zeros_when_no_activity(self, client, auth_headers):
        resp = await client.get("/analytics", headers=auth_headers)
        kpis = resp.json()["kpis"]
        assert kpis["total_questions"] == 0
        assert kpis["deflection_rate"] == 0.0
        assert kpis["cost_savings"] == 0.0
        assert resp.json()["top_questions"] == []
        assert resp.json()["channel_distribution"] == []

    async def test_unanswered_grows_after_simulated_handoff(self, client, auth_headers):
        await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web", "message": "Test question?"},
        )
        resp = await client.get("/analytics", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()["unanswered"]) >= 1

    async def test_dashboard_alias_returns_same_shape(self, client, auth_headers):
        resp = await client.get("/analytics/dashboard", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "kpis" in data
        assert "unanswered" in data

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/analytics")
        assert resp.status_code == 401

    async def test_tenant_isolation(self, client, auth_headers):
        # Simulate a handoff for the registered tenant
        await client.post("/handoffs/simulate", headers=auth_headers, json={"channel": "web"})
        # Stats for a different tenant (using raw JWT for non-existent tenant) should be zeros
        from app.auth import sign_jwt
        other = {"Authorization": f"Bearer {sign_jwt(sub=999, tid=999, tk='ghost', role='company')}"}
        resp = await client.get("/analytics", headers=other)
        # The endpoint will succeed (no tenant existence check) but return empty data
        assert resp.status_code == 200
        assert resp.json()["kpis"]["total_questions"] == 0
