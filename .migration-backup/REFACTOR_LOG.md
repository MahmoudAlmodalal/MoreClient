# REFACTOR_LOG

Chronological record of substantive changes, with reasoning and impacted modules.

---

## 2026-05-24 — Pass 1: P0 Security Hardening

**Context.** A full audit found the codebase architecturally clean but with concrete
production-security holes. Scope for this pass (user-approved): fix only the genuinely
dangerous P0 issues, preserve business logic, keep keyless dev bootable. Deployment
target is Replit. Auth decision: *harden + guard now* (no full login flow yet).
Database decision: stay SQLite, add Alembic later (not this pass).

All changes verified: `pytest` 31 passed · frontend `typecheck`/`lint`/`build` clean ·
keyless smoke test runs to completion · admin guard verified over HTTP (401 without/invalid
key, passes with valid key) · `X-Request-ID` echoed and propagated.

### 1. Admin authentication guard
- **New** [backend/core/security.py](backend/core/security.py): `require_admin` dependency.
  Accepts `Authorization: Bearer <key>` or `X-Admin-Key`, constant-time compared to
  `ADMIN_API_KEY`. **Fail-closed** — no/invalid key → 401. Keyless demo preserved only when
  `ENV=dev` **and** `ALLOW_INSECURE_ADMIN=1` (logged loudly).
- [backend/main.py](backend/main.py): admin router now included with
  `dependencies=[admin_guard]`, covering all 7 admin routes incl. `/api/admin/health`.
- **Why:** `/api/admin/*` (tenant CRUD, MRR/KPIs, host CPU/RAM) was completely
  unauthenticated. Highest-severity finding.
- **Impact:** admin router (behaviour only; `admin.py` source unchanged), config, frontend.

### 2. Channel secrets encrypted at rest + masked in responses
- **New** [backend/core/crypto.py](backend/core/crypto.py): Fernet helper keyed off
  `APP_SECRET`. `encrypt`/`decrypt` (legacy plaintext passes through → transparent migration),
  `mask` (`••••1234`), `is_masked`.
- [backend/routers/settings.py](backend/routers/settings.py): encrypt `telegram_token`/
  `twilio_token` on PUT; mask them in GET; ignore an echoed mask so it never clobbers the
  stored secret.
- Decrypt at the three consumer read-sites:
  [telegram_poller.py](backend/services/channels/telegram_poller.py),
  [telegram.py](backend/services/channels/telegram.py),
  [channels.py](backend/routers/channels.py) (Twilio signature check).
- **Why:** tokens were plaintext in SQLite and returned wholesale by `GET /api/settings`.
- **Impact:** settings flow + channel adapters. API contract unchanged for non-secret fields.

### 3. Per-IP rate limiting
- **New** [backend/core/ratelimit.py](backend/core/ratelimit.py): slowapi `Limiter`
  (default `200/min`). Explicit tighter limits: chat `30/min`, upload `10/min`.
- [backend/main.py](backend/main.py): limiter + `RateLimitExceeded` handler + `SlowAPIMiddleware`.
- Exempted provider webhooks (`/telegram/webhook`, `/whatsapp/webhook`) and `/health` so
  retries/probes are never throttled.
- **Why:** no abuse/DoS protection existed on any endpoint.
- **Impact:** chat, files, channels routers; main.

### 4. CORS + boot-time config validation
- [backend/main.py](backend/main.py): `_validate_boot_config()` in lifespan — refuses to
  start if `ALLOWED_ORIGINS` contains `*` (credentials are enabled); fails fast on missing
  `APP_SECRET`/`ADMIN_API_KEY` when `ENV != dev`; logs resolved origins.
- [check_env.py](check_env.py): now ENV-aware — non-fatal in dev (keyless), hard-fails in prod.
- [start.sh](start.sh): runs `check_env.py` before serving; drops `--reload` outside dev.
- **Why:** fragile CORS footgun + no startup guardrails.

### 5. File upload hardening
- [backend/routers/files.py](backend/routers/files.py): `_sanitize_filename` (strips path
  components/control chars, caps length) and `_content_matches_extension` (magic-byte sniff
  for pdf/docx/xlsx) so a binary renamed `.pdf` is rejected. Existing whitelist + 10 MB cap kept.

### 6. Structured logging + request correlation
- **New** [backend/core/logging_config.py](backend/core/logging_config.py): JSON formatter
  (dependency-free) + `RequestContextMiddleware` (**pure ASGI**, so the `request_id`
  contextvar reaches handler logs and threadpool workers; `X-Request-ID` echoed).
- [backend/main.py](backend/main.py): replaced `basicConfig` with `setup_logging()`.

### 7. Frontend admin-key wiring
- [MoreClient/src/lib/api.ts](MoreClient/src/lib/api.ts): `apiGet`/`apiSend` accept optional
  headers; the 6 admin helpers send `X-Admin-Key` from `sessionStorage`.
- [MoreClient/src/app/admin/page.tsx](MoreClient/src/app/admin/page.tsx): key-entry gate
  shown only on a `401`; keyless-dev backends never trigger it.

### 8. Dependencies & tests
- [requirements.txt](requirements.txt): added `cryptography>=42`, `slowapi>=0.1.9`.
- New tests: `test_security.py`, `test_crypto.py`, `test_files_upload.py`,
  `test_settings_secrets.py` under [backend/tests/](backend/tests/).

### Known pre-existing (NOT caused by this pass)
- Keyless smoke test steps 2–3: the bot escalates a document question via **intent
  classification** (confidence 0.94 — not a low-confidence escalation). Routing/RAG/intent
  code was untouched here; this is existing keyless/intent behaviour.

### Deferred to later passes (see PRODUCTION_READINESS_CHECKLIST.md)
Full auth/login · Postgres · Alembic + `Conversation.customer_ref` index · Docker/CI ·
per-tenant auth on non-admin routes · observability export · broader test coverage.
