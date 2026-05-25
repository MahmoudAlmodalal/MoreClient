# PRODUCTION_READINESS_CHECKLIST

> clientMORE (FastAPI backend `:8000` + Next.js frontend `:5000`). Deploy target: **Replit**.
> Last updated: 2026-05-24 after the P0 Security Hardening pass.

**Readiness score: 5.5 / 10** — core security holes closed; infra/observability/coverage still thin.
(Pre-pass baseline was ~3/10: admin fully open, secrets in plaintext, no rate limiting.)

---

## ✅ Completed (this pass)

| Item | Evidence |
|---|---|
| Admin endpoints authenticated (fail-closed) | `core/security.py`, `main.py` router guard; HTTP-verified 401/pass |
| Channel secrets encrypted at rest (Fernet) | `core/crypto.py`, `routers/settings.py` |
| Secrets masked in API responses; echo-safe PUT | `test_settings_secrets.py` |
| Per-IP rate limiting (chat/upload/global); webhooks+health exempt | `core/ratelimit.py`, `main.py` |
| CORS `*`+credentials rejected at boot | `_validate_boot_config()` |
| Fail-fast on missing prod secrets (`ENV != dev`) | `main.py`, `check_env.py` |
| Structured JSON logging + request-ID correlation | `core/logging_config.py` |
| File upload: filename sanitize + magic-byte sniff | `routers/files.py`, `test_files_upload.py` |
| Frontend admin-key gate + header injection | `api.ts`, `admin/page.tsx` |
| Regression tests (31 passing) | `pytest backend/tests` |

## ⏳ Pending (sequenced for later passes)

**P1 — Auth & data**
- [ ] Real auth/login (sessions or JWT), wire `AuthUser`, per-user roles.
- [ ] Per-tenant authorization on non-admin routes (`/api/settings`, `/api/handoffs`, …) — currently single-tenant/open.
- [ ] Alembic migrations (additive only) + index on `Conversation.customer_ref`.

**P2 — Infra & deploy (Replit)**
- [ ] Persist `backend.db` + `chroma_store` to Replit-persistent storage; document backup.
- [ ] Set `ENV=prod`, `APP_SECRET`, `ADMIN_API_KEY` in Replit Secrets; verify boot fail-fast.
- [ ] Document the ChromaDB single-writer constraint in the run instructions (seed before serve).

**P2 — Observability**
- [ ] Ship JSON logs to an external sink; add error tracking (e.g. Sentry).
- [ ] Request access-logging middleware (method/path/status/latency).

**P3 — Testing & quality**
- [ ] Tests for channel webhooks, RAG escalation, analytics, handoff reply.
- [ ] HTTP-level rate-limit test (429 past threshold) in CI.
- [ ] Address `datetime.utcnow()` deprecations (Py 3.14) — currently warnings only.

## 🚧 Blockers for "true production"
- **No real authentication** — admin is key-guarded, but end-user/tenant auth is still scaffold.
  Acceptable for a guarded demo/single-operator deploy; not for multi-tenant GA.
- **SQLite + ChromaDB single-writer** — fine for one Replit instance; blocks horizontal scaling.

## Deployment readiness by scenario
- **Guarded demo / single operator on Replit:** ✅ ready after setting `ENV=prod` + the two secrets.
- **Multi-tenant production / horizontal scale:** ❌ needs P1 auth + Postgres/Alembic first.
