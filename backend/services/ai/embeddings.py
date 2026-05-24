"""Embeddings with a provider switch and a deterministic offline fallback.

Provider is chosen by ``settings.embedding_provider_chain()``:
- "gemini": Gemini's OpenAI-compatible endpoint (text-embedding-004, 768-dim).
- "openai": OpenAI (text-embedding-3-small, 1536-dim).
- "mistral": Mistral (mistral-embed, 1024-dim by default).
- "hash"  : a keyless MD5 pseudo-embedding so the app still boots/demos without secrets.

The active provider must stay consistent across ingestion and query time, since the
vector dimension differs between providers.
"""

import hashlib
import math
from functools import lru_cache

from backend.core.config import settings
from backend.services.ai import text_normalize

_clients: dict[str, object] = {}


def _client_for(provider: str):
    """Lazily build (and cache) an OpenAI-compatible client for the provider."""
    if provider not in _clients:
        from openai import OpenAI

        if provider == "gemini":
            _clients[provider] = OpenAI(
                api_key=settings.GEMINI_API_KEY, base_url=settings.GEMINI_BASE_URL
            )
        elif provider == "mistral":
            _clients[provider] = OpenAI(
                api_key=settings.MISTRAL_API_KEY, base_url=settings.MISTRAL_BASE_URL
            )
        else:  # openai
            _clients[provider] = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _clients[provider]


def _model_for(provider: str) -> str:
    if provider == "gemini":
        return settings.GEMINI_EMBED_MODEL
    if provider == "mistral":
        return settings.MISTRAL_EMBED_MODEL
    return settings.EMBED_MODEL


def _hash_embed(text: str) -> list[float]:
    """Deterministic bag-of-tokens vector hashed into EMBED_DIM dimensions.

    Tokens are normalized (lowercase + Arabic folding) so AR queries that don't
    diacritize exactly like the source still land on the same hash buckets — the
    single biggest keyless-retrieval win without an embedding key.
    """
    dim = settings.EMBED_DIM
    vec = [0.0] * dim
    for token in text_normalize.tokenize(text):
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    errors: list[str] = []
    for provider in settings.embedding_provider_chain():
        try:
            vectors = _embed_texts_with_provider(provider, texts)
            if vectors and len(vectors[0]) != settings.EMBED_DIM:
                errors.append(f"{provider} returned {len(vectors[0])} dimensions")
                continue
            return vectors
        except Exception as exc:
            errors.append(f"{provider}: {exc.__class__.__name__}")
            continue
    return [_hash_embed(t) for t in texts]


def _embed_texts_with_provider(provider: str, texts: list[str]) -> list[list[float]]:
    if provider == "hash":
        return [_hash_embed(t) for t in texts]
    client = _client_for(provider)
    model = _model_for(provider)
    try:
        resp = client.embeddings.create(model=model, input=texts)
        return [item.embedding for item in resp.data]
    except Exception:
        # Some OpenAI-compatible endpoints reject batched input — retry one at a time.
        out: list[list[float]] = []
        for t in texts:
            resp = client.embeddings.create(model=model, input=t)
            out.append(resp.data[0].embedding)
        return out


@lru_cache(maxsize=256)
def _embed_query_cached(text: str) -> tuple[float, ...]:
    return tuple(embed_texts([text])[0])


def embed_query(text: str) -> list[float]:
    # Cache repeated queries (benchmarks, common questions) to cut latency. The
    # active provider is process-stable, so a key change requires a restart anyway.
    return list(_embed_query_cached(text))
