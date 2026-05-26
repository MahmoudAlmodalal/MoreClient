import json
import httpx
from app.config import settings


async def llm_complete(messages: list[dict]) -> str | None:
    result = await _call_gemini(messages)
    if result is not None:
        return result
    return await _call_openai(messages)


async def llm_complete_local_first(
    messages: list[dict], *, prefer_local: bool = False
) -> tuple[str | None, bool]:
    """Return (answer, is_local). Tries local LLM first if prefer_local=True."""
    if prefer_local:
        result = await _call_local_llm(messages)
        if result is not None:
            return result, True
    return await llm_complete(messages), False


async def _call_local_llm(messages: list[dict]) -> str | None:
    if not settings.local_llm_enabled:
        return None
    url = f"{settings.local_llm_url.rstrip('/')}/chat/completions"
    payload = {"model": settings.local_llm_model, "messages": messages, "temperature": 0.3}
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            return None


async def _call_openai(messages: list[dict]) -> str | None:
    if not settings.openai_api_key:
        return None
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    payload = {"model": "gpt-4o-mini", "messages": messages, "temperature": 0.3}
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception:
            return None


async def _call_gemini(messages: list[dict]) -> str | None:
    if not settings.gemini_api_key:
        return None
    url = (
        f"{settings.gemini_base_url.rstrip('/')}/models/gemini-1.5-flash:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    system_parts = [m["content"] for m in messages if m["role"] == "system"]
    contents = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
        for m in messages if m["role"] != "system"
    ]
    payload: dict = {"contents": contents}
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n".join(system_parts)}]}
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            return None
