"""Embeddings via OpenAI, with a deterministic offline fallback.

When OPENAI_API_KEY is set we use text-embedding-3-small. Without it we fall
back to a hash-based pseudo-embedding so the app still boots and the RAG path
remains demonstrable (lexical overlap) in dev without secrets.
"""

import hashlib
import math

from backend.core.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI

        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _hash_embed(text: str) -> list[float]:
    """Deterministic bag-of-tokens vector hashed into EMBED_DIM dimensions."""
    dim = settings.EMBED_DIM
    vec = [0.0] * dim
    for token in text.lower().split():
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not settings.has_openai:
        return [_hash_embed(t) for t in texts]
    resp = _get_client().embeddings.create(model=settings.EMBED_MODEL, input=texts)
    return [item.embedding for item in resp.data]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
