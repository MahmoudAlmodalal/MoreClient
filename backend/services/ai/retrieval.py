"""Hybrid retrieval: dense vector + BM25 lexical, fused with Reciprocal Rank
Fusion, then diversified with Maximal Marginal Relevance.

Why hybrid: dense vectors capture meaning but miss exact tokens (names, IDs,
URLs, rare Arabic spellings); BM25 nails those but misses paraphrase. Fusing the
two ranked lists recovers both — and it's the single biggest lever in *keyless*
mode, where the hash embedding is itself lexical and noisy. MMR then drops
near-duplicate chunks so the LLM sees diverse, non-redundant context.

Pure-Python, no extra deps. The BM25 index is built lazily over the Chroma
corpus and cached; ``invalidate()`` is called by vectorstore on any write.

``hybrid_search(query_text, query_embedding, k) -> list[vectorstore.Hit]`` is the
entry point. Each returned Hit carries a vector-derived distance/confidence, so
the RAG escalate gate keeps the same semantics as plain vector search.

Tunable via env (safe defaults baked in; see _AI_HANDOFF.md):
  RAG_FETCH_MULTIPLIER (4)  candidate pool = max(k*mult, 12)
  RAG_RRF_K (60)            RRF damping constant
  RAG_MMR_LAMBDA (0.7)      relevance vs. diversity tradeoff [0..1]
"""

from __future__ import annotations

import math
import os

from backend.services.ai import text_normalize, vectorstore


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name) or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name) or default)
    except ValueError:
        return default


_FETCH_MULT = _env_int("RAG_FETCH_MULTIPLIER", 4)
_RRF_K = _env_int("RAG_RRF_K", 60)
_MMR_LAMBDA = min(max(_env_float("RAG_MMR_LAMBDA", 0.7), 0.0), 1.0)
_K1, _B = 1.5, 0.75  # standard BM25 params

_index: dict | None = None


def invalidate() -> None:
    """Drop the cached lexical index (called on any KB write)."""
    global _index
    _index = None


def _get_index() -> dict:
    global _index
    if _index is None:
        _index = _build_index()
    return _index


def _build_index() -> dict:
    rows = vectorstore.all_chunks()  # (id, text, metadata, embedding)
    ids = [r[0] for r in rows]
    texts = [r[1] for r in rows]
    metas = [r[2] for r in rows]
    embs = [list(r[3]) if r[3] is not None else [] for r in rows]
    n = len(ids)

    tfs: list[dict[str, int]] = []
    lengths: list[int] = []
    df: dict[str, int] = {}
    for text in texts:
        tf: dict[str, int] = {}
        for tok in text_normalize.tokenize(text):
            tf[tok] = tf.get(tok, 0) + 1
        tfs.append(tf)
        lengths.append(sum(tf.values()))
        for tok in tf:
            df[tok] = df.get(tok, 0) + 1
    avgdl = (sum(lengths) / n) if n else 0.0
    idf = {t: math.log(1 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}

    return {
        "ids": ids, "texts": texts, "metas": metas, "embs": embs,
        "tfs": tfs, "lengths": lengths, "avgdl": avgdl, "idf": idf, "n": n,
        "pos": {cid: i for i, cid in enumerate(ids)},
    }


def _cosine(a, b) -> float:
    if not a or not b:
        return 0.0
    dot = na = nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / math.sqrt(na * nb)


def _bm25_scores(query: str, idx: dict) -> dict[int, float]:
    q_tokens = text_normalize.tokenize(query)
    avgdl = idx["avgdl"] or 1.0
    scores: dict[int, float] = {}
    for i in range(idx["n"]):
        tf, dl = idx["tfs"][i], idx["lengths"][i]
        s = 0.0
        for t in q_tokens:
            f = tf.get(t)
            if not f:
                continue
            s += idx["idf"].get(t, 0.0) * (f * (_K1 + 1)) / (
                f + _K1 * (1 - _B + _B * dl / avgdl)
            )
        if s > 0:
            scores[i] = s
    return scores


def _mmr(query_emb, pool: list[int], idx: dict, k: int) -> list[int]:
    qsim = {i: _cosine(query_emb, idx["embs"][i]) for i in pool}
    selected: list[int] = []
    candidates = list(pool)
    while candidates and len(selected) < k:
        best, best_score = None, None
        for i in candidates:
            div = max((_cosine(idx["embs"][i], idx["embs"][j]) for j in selected), default=0.0)
            score = _MMR_LAMBDA * qsim[i] - (1 - _MMR_LAMBDA) * div
            if best_score is None or score > best_score:
                best, best_score = i, score
        selected.append(best)
        candidates.remove(best)
    return selected


def hybrid_search(query_text: str, query_embedding: list[float], k: int) -> list:
    """Return up to k diverse, relevance-ranked Hits fusing vector + BM25."""
    idx = _get_index()
    if idx["n"] == 0:
        return []

    fetch = max(k * _FETCH_MULT, 12)

    # Dense ranking via Chroma ANN (scales), aligned to corpus positions by id.
    vec_hits = vectorstore.query(query_embedding, k=min(fetch, idx["n"]))
    vec_rank = [idx["pos"][h.id] for h in vec_hits if h.id in idx["pos"]]

    # Lexical ranking via BM25 over normalized tokens.
    lex = _bm25_scores(query_text, idx)
    lex_rank = sorted(lex, key=lambda i: -lex[i])[:fetch]

    # Reciprocal Rank Fusion of the two ranked lists.
    rrf: dict[int, float] = {}
    for rank, i in enumerate(vec_rank):
        rrf[i] = rrf.get(i, 0.0) + 1.0 / (_RRF_K + rank + 1)
    for rank, i in enumerate(lex_rank):
        rrf[i] = rrf.get(i, 0.0) + 1.0 / (_RRF_K + rank + 1)
    if not rrf:  # degenerate (e.g. empty query) — fall back to vector order
        rrf = {i: 1.0 for i in vec_rank}
    pool = sorted(rrf, key=lambda i: -rrf[i])[:fetch]

    selected = _mmr(query_embedding, pool, idx, k)

    hits = []
    for i in selected:
        sim = _cosine(query_embedding, idx["embs"][i])
        hits.append(
            vectorstore.Hit(
                text=idx["texts"][i],
                distance=1.0 - sim,  # matches Chroma cosine-distance convention
                metadata=idx["metas"][i] or {},
                id=idx["ids"][i],
            )
        )
    return hits
