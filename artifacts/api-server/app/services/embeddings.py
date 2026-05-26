import httpx
from app.config import settings


async def embed_texts(texts: list[str]) -> list[list[float] | None]:
    if not settings.openai_api_key or not texts:
        return [None] * len(texts)
    url = f"{settings.openai_base_url.rstrip('/')}/embeddings"
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                url,
                json={"model": "text-embedding-3-small", "input": texts},
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
            items = sorted(data["data"], key=lambda x: x["index"])
            return [item["embedding"] for item in items]
        except Exception:
            return [None] * len(texts)


async def embed_one(text: str) -> list[float] | None:
    results = await embed_texts([text])
    return results[0]
