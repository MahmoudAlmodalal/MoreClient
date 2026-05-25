# TECHNICAL_DEBT_TRACKER

> Governance baseline maintained by the Project Preservation & Architecture Alignment Agent.
> Last updated: 2026-05-24 · Branch: `frontend-dev`

Severity: **S1** critical (blocks safe production) · **S2** high · **S3** medium · **S4** low/cosmetic.
Status: `open` · `in-progress` · `accepted` (knowingly tolerated) · `resolved`.

---

## TD-01 · Auth not wired; admin endpoints unauthenticated — **S1**, open
- **Debt:** sign-up UI, OAuth config keys, and `AuthUser` table exist, but there is no backend auth
  router and no working login. `admin.py` / the `/admin` page expose tenant CRUD with **no real
  authentication**. The product presents as multi-tenant SaaS but cannot authenticate tenants.
- **Risk:** any unauthenticated caller can perform tenant CRUD. Security-critical before any public
  deployment.
- **Mitigation plan:** build a real auth router (session/JWT), guard `/admin` and tenant-scoped
  routes, wire the existing sign-up UI to it. Use the existing `AuthUser` table; do **not** pivot to
  Clerk/blueprint auth unless explicitly directed.
- **Refactor priority:** highest. Blocks production identity claim (see PRODUCT_IDENTITY_PROTECTION §6).

## TD-02 · No general migration tool — **S2**, accepted (revisit at scale)
- **Debt:** schema evolves via idempotent `create_all` + a one-off `upgrade_existing_schema()` ALTER
  shim. Fine for current SQLite footprint; will not survive multi-tenant/Postgres.
- **Mitigation plan:** if/when migrations are needed, introduce **Alembic additively**. No destructive
  migration, no data-layer rewrite.
- **Refactor priority:** deferred until a Postgres move or real multi-tenancy is on the table.

## TD-03 · Hand-synced frontend/backend type contract — **S2**, open
- **Debt:** `src/lib/api.ts` TS types manually mirror `backend/schemas/*`. A Pydantic alias rename
  breaks the frontend at runtime, not compile time.
- **Mitigation plan:** enforce "change both sides in one commit" by convention now; adopt OpenAPI-based
  TS codegen **only if** schema churn increases (avoid premature tooling).
- **Refactor priority:** medium; monitor schema change frequency.

## TD-04 · Stale docs + dead-scaffold residue — **S3**, open
- **Debt:**
  - CLAUDE.md still lists `src/server/`, top-level `frontend/`, and `src/app/api/v1/*` as existing dead
    stubs — all already removed. It also says backend is "Untracked in git" — it is now tracked.
  - Empty `MoreClient/src/app/api/` directory lingers (invites re-introducing a TS API layer).
- **Mitigation plan:** refresh CLAUDE.md to current reality; delete the empty `api/` dir.
- **Refactor priority:** medium — stale "ignore this" notes erode trust in the canonical doc.

## TD-05 · Root-level test/probe clutter, partly tracked in git — **S3**, open
- **Debt:** the git root holds throwaway probe scripts and fixtures —
  `test_curl.py`, `test_curl_stream.py`, `test_models.py`, `test_nvidia*.py` (6 variants),
  `test_prompt.py`, plus `dummy.txt` / `large_dummy.txt`. At least `test_curl.py`, `test_nvidia.py`,
  `dummy.txt`, `large_dummy.txt` are **committed**. These are not the real test suite
  (`backend/tests/` + `_checkpoint1.py` + `backend/scripts/*`).
- **Risk:** confuses the test story; dead code accumulation; committed binaries/fixtures bloat history.
- **Mitigation plan:** move genuine probes into `backend/scripts/` or a `scripts/dev/` folder, delete
  the rest, and `.gitignore` scratch fixtures. Confirm with owner before removing committed files
  (they may be referenced by demo notes).
- **Refactor priority:** medium.

## TD-06 · Committed runtime data at git root — **S3**, open
- **Debt:** `backend.db` (SQLite) and `chroma_store/` live at the git root as runtime state.
- **Risk:** runtime data drifting into version control; non-reproducible state; merge noise.
- **Mitigation plan:** verify they are git-ignored (not tracked); document that `seed_demo` regenerates
  them. Do not commit DB/vector-store snapshots.
- **Refactor priority:** medium.

## TD-07 · Keyless confidence floor (known limitation) — **S4**, accepted
- **Debt:** hash-embed confidence is lexical and floors ~0.50, so confidence-based escalation does not
  separate cleanly in keyless mode.
- **Mitigation:** documented behavior — demo escalation via the "talk to a human" keyword; keep
  threshold 0.45 in keyless mode; raise to ~0.6 only with a real embedding key. **Not a bug to fix.**
- **Refactor priority:** none (accepted, documented).

---

## Debt intake rule
New debt is logged here *when it is created or discovered*, not after it festers. Any change that
takes a deliberate shortcut MUST add a TD entry in the same commit describing the shortcut and its
repayment plan. This keeps shortcuts visible instead of silent.
