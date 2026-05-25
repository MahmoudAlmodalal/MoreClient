# ARCHITECTURE_ALIGNMENT_REPORT

> Governance baseline maintained by the Project Preservation & Architecture Alignment Agent.
> Last updated: 2026-05-24 · Branch: `frontend-dev` · HEAD: `f6259ee`

This document records architecture-consistency findings, structural/compatibility risks, and the
set of patterns that are **approved** (extend these) vs **rejected** (do not introduce these). It is
the contract a senior reviewer would enforce before any non-trivial change lands.

---

## 1. Canonical architecture (the thing we protect)

clientMORE is a **two-app system**. This is the load-bearing fact; do not blur it.

| App | Stack | Port | Role |
|---|---|---|---|
| **Backend** | Python 3.14, FastAPI | `:8000` | The brain — ingestion, RAG, channels, handoff. SQLite + ChromaDB. |
| **Frontend** | Next.js 16 (App Router), React 19 | `:5000` | Thin dashboard + widget. Owns **no** data; calls the backend over HTTP. |

Run the stack from the git root via `bash start.sh`.

### Approved layering (do not deviate)
- **Backend 3-layer-lite**: `routers/<x>.py` (HTTP shape + Pydantic parse) → `services/...`
  (business logic, takes `db: Session`, **commits explicitly**) → SQLAlchemy ORM directly.
  **There is no repository layer and we are not adding one** unless a concrete need is proven.
- **Routers are mounted prefix-free**; each router declares its own path. `channels` is intentionally
  prefix-free for provider webhooks. Keep this — do not introduce a global `/api/v1` versioning prefix
  without an explicit migration plan.
- **Channels = one brain, many transports**: every channel implements the `Channel` ABC
  (`parse → reply → deliver`) and converges on `ChatService.handle()`. New channels MUST go through
  the `ChannelFactory` registry and the single `handle()` entry — never a parallel chat path.
- **Chat routing is an ordered gate chain** (handoff → purchase flow → intent → RAG fallback).
  Read `chat_service.handle()` before touching routing. New gates are inserted into the chain with an
  explicit priority rationale; they do not fork the flow.
- **SQL ↔ Chroma kept in sync by deterministic ID convention** (`doc-{id}-{i}`, `learned-{id}`).
  Deletion uses metadata `where` filters. Any new vector-backed entity MUST follow the same ID scheme
  so deletion stays ID-free in SQL.
- **Single-row `Setting` (id=1)** holds all tenant/bot config. Always access via
  `get_or_create_settings(db)`. **Never** instantiate a second `Setting` row.
- **Multi-provider with keyless fallback** (Gemini → DeepSeek/NVIDIA → OpenAI for chat; Gemini →
  OpenAI → MD5-hash for embeddings) via OpenAI-compatible endpoints — **no per-provider SDKs**. New
  providers go through `config.*_provider_chain()`, not bespoke clients.

### Approved frontend patterns
- All backend access flows through `src/lib/api.ts` (`apiGet`/`apiSend`/`apiUpload`). No component
  should `fetch` the backend directly.
- TS response types in `api.ts` **mirror `backend/schemas/*`** (camelCase ↔ Pydantic camelCase
  aliases). These are a hand-maintained contract — see Risk #3.
- Fetch-on-mount goes through `useAsyncOnMount`/`usePolling`; logged-in role through `useSessionRole`.
  Do **not** hand-roll `useEffect`+`setState` loaders — the `react-hooks/set-state-in-effect` lint
  rule is deliberately kept on.
- Bilingual EN/AR + RTL via the hand-rolled `language-provider.tsx`. Brand string is **"clientMORE"**.
  Do not introduce `next-intl` or a second i18n system.

---

## 2. Findings — current alignment status

### ✅ Aligned / healthy
- Backend module layout is consistent with the documented 3-layer-lite pattern across all 8 routers.
- Frontend component grouping by surface (`ui/`, `landing/`, `auth/`, `dashboard/`) is consistent.
- Recent commits (`78f1c4f`→`d8aea5d`) are **disciplined incremental refactors** (hook extraction,
  a11y, render-time sync) — exactly the kind of low-risk evolution this governance favors. No drift.
- Dead TS-monolith scaffold (`src/server/`) and the Vite prototype (top-level `frontend/`) were
  **correctly removed** in `4387065`. Good hygiene.

### ⚠️ Risks & inconsistencies (open)

**Risk #1 — Documentation drift in CLAUDE.md (low severity, high confusion cost).**
CLAUDE.md still describes as "existing dead stubs" several things that have since been deleted:
- `src/server/` — **removed** (gone from tree).
- top-level `frontend/` Vite prototype — **removed**.
- It also states the backend is *"Untracked in git"* — but `backend/` **is now tracked**
  (`git ls-files backend` returns files).

→ *Recommendation:* refresh CLAUDE.md to match reality. Stale "ignore this" notes are nearly as
  dangerous as stale code — they erode trust in the one document we ask everyone to trust.

**Risk #2 — Empty `MoreClient/src/app/api/` directory lingers.**
The `src/app/api/v1/*` route stub was emptied but the `api/` directory remains. In Next.js App Router
an empty `api/` segment is harmless but invites someone to "fill it in" with a TS API layer —
re-introducing the blueprint-vs-implementation confusion we just cleaned up.
→ *Recommendation:* delete the empty directory.

**Risk #3 — Frontend/backend contract is hand-synced (medium severity).**
`src/lib/api.ts` TS types manually mirror `backend/schemas/*`. There is no codegen or shared schema,
so a backend alias rename silently breaks the frontend at runtime, not compile time.
→ *Approved mitigation path:* keep them in sync by discipline for now (documented convention), but any
  schema change MUST update both sides in the same change. Flagged in TECHNICAL_DEBT_TRACKER as a
  candidate for OpenAPI-based type generation **only if** schema churn increases.

**Risk #4 — No general migration tool (accepted constraint, scale risk).**
Schema evolution relies on idempotent `create_all` + the one-off `upgrade_existing_schema()` ALTER
shim. This is fine for the current SQLite single-tenant-ish footprint but will not survive a real
multi-tenant production rollout or a Postgres move.
→ *Governance stance:* acceptable now; **a destructive migration is rejected**. If migrations become
  necessary, introduce Alembic additively — do not rewrite the data layer.

**Risk #5 — Shared working tree across parallel sessions (process risk).**
Multiple agent sessions share one working tree; the branch can switch underneath an in-flight change.
→ *Hard rule for all contributors:* assert the branch immediately before any commit, and stage by
  explicit path — **never `git add -A`**.

---

## 3. Approved vs Rejected patterns (quick reference)

| Approved (extend) | Rejected (do not introduce) |
|---|---|
| 3-layer-lite, explicit commits in services | Repository/UoW layer, ORM-in-routers |
| `ChannelFactory` + single `handle()` | A second/parallel chat entry path |
| Ordered gate chain, new gates by priority | Forking the routing flow per feature |
| Deterministic Chroma ID convention | Storing chunk IDs in SQL; ad-hoc vector schemes |
| `get_or_create_settings(db)` single row | A second `Setting` row / scattered config tables |
| OpenAI-compat provider chain | Per-provider SDK dependencies |
| `api.ts` as sole backend gateway | Direct `fetch` from components |
| `useAsyncOnMount`/`useSessionRole` hooks | Hand-rolled `useEffect`+`setState` loaders |
| Hand-rolled `language-provider` (EN/AR) | `next-intl` or a second i18n system |
| Additive Alembic *if needed* | Destructive migrations; data-layer rewrite |

---

## 4. Governance notes
- The aspirational TS modular-monolith blueprint (Prisma/Clerk/Inngest/Stripe/Pusher) is **roadmap,
  not reality**. Treat the Python backend as the source of truth unless the user is explicitly building
  the blueprint out. Reject silent partial adoption of blueprint pieces into the live app.
- Auth is half-scaffolded and **not wired** for end users. **Update (2026-05-24):** `/admin` tenant
  CRUD is **no longer unauthenticated** — it is now guarded by a fail-closed `ADMIN_API_KEY`
  (see §5). Full end-user/tenant login remains a roadmap item tracked in PRODUCT_IDENTITY_PROTECTION
  and TECHNICAL_DEBT_TRACKER.

---

## 5. Update — P0 Security Hardening pass (2026-05-24)

A user-approved security pass landed. It was deliberately **additive and architecture-preserving** —
no layering changes, no new chat path, no data-layer rewrite, no second `Setting` row. It respects
the Approved/Rejected table above. Summary (full detail in REFACTOR_LOG.md):

- **Admin guard** (`core/security.py`) applied at the router include in `main.py` — fail-closed
  `ADMIN_API_KEY` via `Authorization: Bearer`/`X-Admin-Key`. Closes the unauthenticated-admin hole.
  Keyless demo preserved only under `ENV=dev` + `ALLOW_INSECURE_ADMIN=1`.
- **Secrets at rest** (`core/crypto.py`): Telegram/Twilio tokens Fernet-encrypted, masked in
  responses. Decryption is transparent at the existing consumer read-sites — channel contract unchanged.
- **Rate limiting** (`core/ratelimit.py`, slowapi), **structured JSON logging + request IDs**
  (`core/logging_config.py`), **CORS/boot validation**, **upload hardening** — all new `core/` modules
  or in-place guards; no existing flow forked.
- **Frontend**: admin-key header added through the existing `api.ts` gateway (no direct `fetch`),
  per the approved pattern.

**Re: Risk #4 (no migration tool).** This pass honoured the governance stance — it did **not** add
Alembic or alter the schema. The deferred Alembic work is recorded as additive-only.

**Verification:** `pytest` 31 passed · frontend typecheck/lint/build clean · keyless smoke runs to
completion · admin guard HTTP-verified. No architectural drift introduced.
