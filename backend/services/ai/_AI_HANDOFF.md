# AI lane handoff — RAG/LLM quality uplift

This change set lives entirely in `backend/services/ai/**` plus
`backend/services/ingestion/chunker.py`. The backend session should review the
items below and promote the ones marked **PROMOTE** into the shared config /
requirements where appropriate. **No public signatures changed** — everything is
extended behind the existing contracts.

## TL;DR of what changed

| File | Change |
|---|---|
| `ingestion/chunker.py` | Structure-aware chunking for markdown FAQ/heading docs (one Q&A per unit, prefixed with `Title — Section`). Unstructured text still uses the old 800/120 splitter. |
| `ai/text_normalize.py` (new) | Shared AR/EN normalizer + tokenizer (lowercase, Arabic alef/hamza/yaa/teh-marbuta folding, diacritic/tatweel stripping, **Arabic-Indic + Persian digit→ASCII folding** so `٥`/`۵` match `5` for numeric facts — hours, registration IDs, phone numbers). |
| `ai/retrieval.py` (new) | Hybrid retrieval: dense vector + BM25 lexical fused with Reciprocal Rank Fusion, then MMR for diversity/dedup. Pure-Python, no deps. |
| `ai/vectorstore.py` | Added `Hit.id`, embedding-dimension guard + sidecar signature, `all_chunks()`, `reset_collection()`, `embedding_signature()`, and write→index cache invalidation. |
| `ai/embeddings.py` | `_hash_embed` now tokenizes via the shared normalizer (better keyless/AR matching); `embed_query` is LRU-cached. |
| `ai/rag.py` | Routes retrieval through `hybrid_search`; stricter bilingual grounding prompts; `__NO_ANSWER__` sentinel → honest escalation (closes the "silent unknown" gap). **Chat clients are now process-cached per provider** (reused httpx connection pool) instead of rebuilt per turn — cuts per-request latency. |
| `ai/_eval.py` (new) | Repeatable AR+EN retrieval (hit@1/hit@3/MRR) + answer-grounding eval. |

## Dependencies

- **pip installs required: NONE.** BM25, RRF and MMR are pure-Python. The only
  third-party imports are the ones already in `requirements.txt`
  (`langchain-text-splitters`, `chromadb`, `openai`).
- *(Optional future)* `rank_bm25` would let us swap the in-house BM25 for a
  battle-tested implementation. Not needed now; if added, import it lazily inside
  `ai/retrieval.py` with a try/except fallback to the current code.

## New environment variables (read locally via `os.getenv` in `ai/retrieval.py`)

All have safe baked-in defaults; the app runs unchanged if none are set.

| Var | Default | Meaning |
|---|---|---|
| `RAG_FETCH_MULTIPLIER` | `4` | Candidate pool size = `max(k * mult, 12)` before fusion/MMR. |
| `RAG_RRF_K` | `60` | Reciprocal Rank Fusion damping constant. |
| `RAG_MMR_LAMBDA` | `0.7` | MMR relevance-vs-diversity tradeoff in `[0,1]` (higher = more relevance). |

**PROMOTE:** consider moving these into `core/config.py` (with `_clamp_int`/
`_clamp_float`) alongside `RETRIEVAL_K` / `CONFIDENCE_THRESHOLD` for consistency.

## Behavioral contract notes (no signature changes)

- `vectorstore.Hit` gained an `id: str = ""` field (defaulted — backward compatible).
  `query()` now populates it from the Chroma row id.
- `rag.VectorRagStrategy.run` now escalates when the model returns the
  `__NO_ANSWER__` sentinel (or a short bilingual "I don't know"), with
  `reason="low_confidence"` and `escalate=True` — same reason strings as before, so
  `chat_service` handoff logic is unaffected. `RagResult.sources` is still populated
  in that case for the dashboard.
- The escalation **gate** now uses `max(hit.confidence)` over the returned hits
  (best vector confidence among candidates) instead of `hits[0].confidence`. With
  hybrid ordering the top fused hit may not be the top vector hit; taking the max
  preserves the previous keyless-floor + keyword-escalation behavior exactly.

## Re-seed / migration requirements (IMPORTANT)

These changes alter how chunks and keyless vectors are produced, so the Chroma
store must be rebuilt once. Honor the single-writer rule (seed before serving):

```
py -X utf8 -m backend.scripts.seed_demo     # before starting uvicorn
```

Re-seed is required because:
1. **Chunking changed** — chunk text/boundaries differ (Q&A units + heading prefix).
2. **Keyless hash embeddings changed** — tokens are now normalized (incl. Arabic-Indic
   digit folding), so hash vectors differ for keyless stores. (Real Gemini/OpenAI
   vectors are unchanged — they embed raw text, not the normalized tokens.) The BM25
   lexical index re-tokenizes stored chunk text at build time, so it picks up the
   digit-folding win immediately, with **no re-seed needed** for keyed setups.

### Embedding-dimension guard

Providers emit different vector sizes (Gemini 3072 / OpenAI 1536 / hash =
`EMBED_DIM`). A Chroma collection fixes its dimension on first insert, so switching
providers against a populated store used to fail every retrieval with a cryptic
Chroma 500. Now:

- The active embedding signature `{provider, dim}` is written to a sidecar file
  `<CHROMA_DIR>/embedding_signature.json` on first write.
- A later read/write with a different dimension raises a clear `RuntimeError`
  telling the operator to re-seed or call `vectorstore.reset_collection()`.
- Pre-existing stores (no sidecar) are not blocked — the signature is backfilled on
  the next write.

To switch embedding providers cleanly:
```python
from backend.services.ai import vectorstore
vectorstore.reset_collection()   # drops collection + signature
# then re-seed (and restart uvicorn so it doesn't cache the old collection)
```

## Eval harness

```
py -X utf8 -m backend.scripts.seed_demo
py -X utf8 -m backend.services.ai._eval            # retrieval hit@1/hit@3/MRR
py -X utf8 -m backend.services.ai._eval --answers  # also score generated answers (needs an LLM key)
```

It auto-detects the wired retrieval path (hybrid if present, else vector-only), so
the same script measures before/after. Golden set covers 10 EN + 10 AR FAQ queries
with exact expected substrings.

## Quality before/after

See the PR description / commit `test(ai): bilingual retrieval eval` for the
captured numbers. Summary (k=4):

- **Gemini (real embeddings):** see PR summary table.
- **Keyless (hash):** see PR summary table.

## Suggested follow-ups (out of this lane)

- Promote the three `RAG_*` knobs into `config.py`.
- For very large per-tenant KBs (thousands of chunks) the in-memory BM25 build is
  O(N) per rebuild; consider persisting the index or delegating lexical search to a
  dedicated store. Current product scale (small FAQ KBs) is fine.
- Optional LLM cross-encoder rerank (deferred — would add latency/cost; the p95<3s
  gate and keyless mode argued against it for now).
