import pytest


class TestLearnEndpoint:
    async def test_creates_entry_and_returns_ok(self, client, auth_headers):
        resp = await client.post(
            "/learn",
            headers=auth_headers,
            json={"question": "What is your return policy?", "answer": "30 days, no questions asked."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert isinstance(data["id"], int)
        assert isinstance(data["document_id"], int)

    async def test_learned_answer_appears_in_files_list(self, client, auth_headers):
        await client.post(
            "/learn",
            headers=auth_headers,
            json={"question": "How do I cancel?", "answer": "Call our support line."},
        )
        resp = await client.get("/files", headers=auth_headers)
        assert resp.status_code == 200
        learned_files = [f for f in resp.json() if f["type"] == "learned"]
        assert len(learned_files) >= 1

    async def test_learn_with_source_handoff_id(self, client, auth_headers):
        sim = await client.post(
            "/handoffs/simulate",
            headers=auth_headers,
            json={"channel": "web", "message": "I need help tracking my order"},
        )
        handoff_id = sim.json()["id"]

        resp = await client.post(
            "/learn",
            headers=auth_headers,
            json={
                "question": "How do I track my order?",
                "answer": "Visit the orders page and enter your order number.",
                "source_handoff_id": handoff_id,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_multiple_learns_create_separate_documents(self, client, auth_headers):
        for i in range(3):
            await client.post(
                "/learn",
                headers=auth_headers,
                json={"question": f"Question {i}", "answer": f"Answer {i}"},
            )
        resp = await client.get("/files", headers=auth_headers)
        learned = [f for f in resp.json() if f["type"] == "learned"]
        assert len(learned) == 3

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.post("/learn", json={"question": "Q", "answer": "A"})
        assert resp.status_code == 401
