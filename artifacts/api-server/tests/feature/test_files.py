import pytest


_TXT_CONTENT = b"This is a test knowledge base document with some useful information about our products."
_EMPTY_CONTENT = b"   \n   "


class TestListFiles:
    async def test_empty_list_initially(self, client, auth_headers):
        resp = await client.get("/files", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated_returns_401(self, client):
        resp = await client.get("/files")
        assert resp.status_code == 401


class TestUploadFile:
    async def test_upload_txt_returns_200_with_chunks(self, client, auth_headers):
        resp = await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("test.txt", _TXT_CONTENT, "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["file"] == "test.txt"
        assert data["chunks"] >= 1
        assert data["status"] == "indexed"

    async def test_upload_empty_txt_returns_empty_status(self, client, auth_headers):
        resp = await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("empty.txt", _EMPTY_CONTENT, "text/plain")},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "empty"

    async def test_uploaded_file_appears_in_list(self, client, auth_headers):
        await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("kb.txt", _TXT_CONTENT, "text/plain")},
        )
        resp = await client.get("/files", headers=auth_headers)
        assert resp.status_code == 200
        files = resp.json()
        assert len(files) == 1
        f = files[0]
        assert f["name"] == "kb.txt"
        assert f["type"] == "text"
        assert isinstance(f["id"], int)
        assert f["status"] == "indexed"

    async def test_file_chunk_count_positive(self, client, auth_headers):
        await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("chunks.txt", _TXT_CONTENT, "text/plain")},
        )
        files = (await client.get("/files", headers=auth_headers)).json()
        assert files[0]["chunks"] >= 1

    async def test_unauthenticated_upload_returns_401(self, client):
        resp = await client.post(
            "/upload",
            files={"file": ("test.txt", _TXT_CONTENT, "text/plain")},
        )
        assert resp.status_code == 401

    async def test_multiple_uploads_all_listed(self, client, auth_headers):
        for name in ("a.txt", "b.txt", "c.txt"):
            await client.post(
                "/upload",
                headers=auth_headers,
                files={"file": (name, _TXT_CONTENT, "text/plain")},
            )
        files = (await client.get("/files", headers=auth_headers)).json()
        assert len(files) == 3


class TestDeleteFile:
    async def test_delete_removes_file(self, client, auth_headers):
        await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("to-delete.txt", _TXT_CONTENT, "text/plain")},
        )
        files = (await client.get("/files", headers=auth_headers)).json()
        file_id = files[0]["id"]

        del_resp = await client.delete(f"/files/{file_id}", headers=auth_headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["ok"] is True

        after = (await client.get("/files", headers=auth_headers)).json()
        assert after == []

    async def test_delete_nonexistent_returns_404(self, client, auth_headers):
        resp = await client.delete("/files/99999", headers=auth_headers)
        assert resp.status_code == 404

    async def test_delete_other_tenant_file_returns_404(self, client, auth_headers):
        await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("shared.txt", _TXT_CONTENT, "text/plain")},
        )
        files = (await client.get("/files", headers=auth_headers)).json()
        file_id = files[0]["id"]

        from app.auth import sign_jwt
        other = {"Authorization": f"Bearer {sign_jwt(sub=999, tid=999, tk='other', role='company')}"}
        resp = await client.delete(f"/files/{file_id}", headers=other)
        assert resp.status_code == 404

    async def test_unauthenticated_delete_returns_401(self, client, auth_headers):
        await client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("file.txt", _TXT_CONTENT, "text/plain")},
        )
        files = (await client.get("/files", headers=auth_headers)).json()
        file_id = files[0]["id"]

        resp = await client.delete(f"/files/{file_id}")
        assert resp.status_code == 401
