# MoreClient

Multi-tenant AI-powered customer support chatbot SaaS with an operator dashboard. Supports Web, Telegram, and WhatsApp channels with RAG-based Q&A, human handoff, and analytics.

## Run & Operate

### API Server (FastAPI/Python)
```bash
cd artifacts/api-server
pip install -r requirements.txt
DATABASE_URL=postgresql://... uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend (React/Vite)
```bash
pnpm --filter @workspace/clientmore run dev
```

### Type-check all packages
```bash
pnpm run typecheck
```

### Regenerate API client from OpenAPI spec
```bash
pnpm --filter @workspace/api-spec run codegen
```

### Push DB schema changes
```bash
# Prerequisite on a fresh DB: CREATE EXTENSION IF NOT EXISTS vector;
pnpm --filter @workspace/db run push
```

## Required Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Prod | auto-generated | JWT signing key |
| `ADMIN_API_KEY` | Prod | auto-generated | Admin endpoint key |
| `PORT` | No | 8080 | API server port |
| `OPENAI_API_KEY` | No | — | Enables embeddings + GPT-4o-mini |
| `GEMINI_API_KEY` | No | — | Enables Gemini 1.5 Flash (tried first) |
| `PUBLIC_API_URL` | No | — | Base URL for Telegram webhook registration |
| `EMBED_DIM` | No | 1536 | Embedding dimension (match your model) |
| `LLM_PROVIDER` | No | auto | LLM routing (auto = try both) |

## Stack

| Layer | Technology |
|---|---|
| Package manager | pnpm workspaces |
| Language (backend) | Python 3.11 |
| API framework | FastAPI + uvicorn |
| Database | PostgreSQL 16 + pgvector |
| ORM (Python) | SQLAlchemy 2.0 async (asyncpg driver) |
| Schema migrations | Drizzle ORM (`lib/db`) |
| Validation (Python) | Pydantic v2 |
| Auth | PyJWT (HS256) + passlib bcrypt |
| HTTP client | httpx (async) |
| WebSocket | FastAPI native WebSocket |
| File parsing | pypdf, python-docx, openpyxl |
| Language (frontend) | TypeScript 5.9 / React 19 |
| Build (frontend) | Vite 7 |
| Routing (frontend) | wouter |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI |
| API codegen | Orval (OpenAPI → React Query hooks + Zod) |

## Where Things Live

| Purpose | Path |
|---|---|
| **FastAPI entry point** | `artifacts/api-server/main.py` |
| **FastAPI app config (env vars)** | `artifacts/api-server/app/config.py` |
| **SQLAlchemy models** | `artifacts/api-server/app/models.py` |
| **Pydantic schemas** | `artifacts/api-server/app/schemas.py` |
| **Auth (JWT + bcrypt)** | `artifacts/api-server/app/auth.py` |
| **WebSocket manager** | `artifacts/api-server/app/websocket_manager.py` |
| **Route handlers** | `artifacts/api-server/app/routes/` |
| **Services (LLM, RAG, delivery)** | `artifacts/api-server/app/services/` |
| **DB schema (source of truth)** | `lib/db/src/schema/index.ts` |
| **OpenAPI spec (source of truth)** | `lib/api-spec/openapi.yaml` |
| **Generated React Query hooks** | `lib/api-client-react/src/generated/` |
| **Generated Zod schemas** | `lib/api-zod/src/generated/` |
| **Frontend entry** | `artifacts/clientmore/src/main.tsx` |
| **Frontend routing** | `artifacts/clientmore/src/App.tsx` |
| **Frontend API fetch wrapper** | `artifacts/clientmore/src/lib/api.ts` |
| **Global styles / design tokens** | `artifacts/clientmore/src/index.css` |
| **i18n + global state context** | `artifacts/clientmore/src/components/language-provider.tsx` |

## API Endpoint Map

All routes are served by the FastAPI server. No `/api` prefix.

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | /healthz | None | routes/health.py |
| POST | /auth/register | None | routes/auth.py |
| POST | /auth/login | None | routes/auth.py |
| POST | /auth/demo-login | None | routes/auth.py |
| GET | /auth/me | JWT | routes/auth.py |
| POST | /auth/refresh | JWT | routes/auth.py |
| POST | /auth/logout | None | routes/auth.py |
| GET | /settings | JWT | routes/settings.py |
| PUT/PATCH | /settings | JWT | routes/settings.py |
| GET | /files | JWT | routes/files.py |
| POST | /upload | JWT | routes/files.py |
| DELETE | /files/{id} | JWT | routes/files.py |
| POST | /chat | None | routes/chat.py |
| GET | /chat/{sessionId}/agent-messages | None | routes/chat.py |
| GET | /handoffs | JWT | routes/handoffs.py |
| POST | /handoffs/simulate | JWT | routes/handoffs.py |
| POST | /handoffs/{id}/reply | JWT | routes/handoffs.py |
| POST | /handoffs/{id}/resolve | JWT | routes/handoffs.py |
| DELETE | /handoffs | JWT | routes/handoffs.py |
| POST | /handoffs/{id}/feedback | JWT | routes/handoffs.py |
| POST | /handoffs/{id}/retry-delivery | JWT | routes/handoffs.py |
| POST | /learn | JWT | routes/learn.py |
| GET | /analytics | JWT | routes/analytics.py |
| GET | /analytics/dashboard | JWT | routes/analytics.py |
| GET | /admin/tenants | X-Admin-Key | routes/admin.py |
| POST | /admin/tenants | X-Admin-Key | routes/admin.py |
| PUT | /admin/tenants/{id} | X-Admin-Key | routes/admin.py |
| DELETE | /admin/tenants/{id} | X-Admin-Key | routes/admin.py |
| POST | /admin/tenants/{id}/toggle | X-Admin-Key | routes/admin.py |
| GET | /admin/kpis | X-Admin-Key | routes/admin.py |
| GET | /admin/health | X-Admin-Key | routes/admin.py |
| POST | /telegram/webhook | None | routes/webhooks.py |
| POST | /whatsapp/webhook | None | routes/webhooks.py |
| WS | /ws/dashboard?token= | JWT (query) | main.py |
| WS | /ws/chat/{sessionId} | None | main.py |

## Architecture Decisions

- **OpenAPI-first**: `lib/api-spec/openapi.yaml` is the contract. The frontend React Query hooks and Zod schemas are generated from it via Orval. Regenerate after any endpoint change.
- **Multi-tenant**: Every DB table is scoped by `tenant_id`. All queries must filter by `tenant_id` derived from the JWT payload (`tid` claim).
- **Drizzle for migrations, SQLAlchemy for queries**: `lib/db` (Node.js Drizzle) owns schema migrations. The Python backend uses SQLAlchemy ORM to query the same tables — no Alembic.
- **Keyless mode**: LLM + embeddings are optional. The chat endpoint works without API keys (falls back to chunk text). Embeddings are skipped; vector search falls back to lexical-only.
- **JWT payload shape**: `{sub: user_id, tid: tenant_id, tk: tenant_key, role: "admin"|"company"}`
- **Admin auth**: Separate `X-Admin-Key` header (not JWT). Uses `hmac.compare_digest` to prevent timing attacks.
- **No tests**: No test suite configured yet.

## Frontend Conventions

- **Routing**: wouter (not Next.js). Never add `next` as a dependency.
- **Next.js shims**: All `next/*` imports → `@/lib/next-shim/*` (shims using wouter).
- **Styling**: Tailwind CSS v4 utility classes + CSS custom properties. Dark theme by default.
- **State**: Context API only (no Redux/Zustand). Global state in `LanguageProvider`.
- **Data fetching**: Direct `apiGet`/`apiSend` wrappers in `src/lib/api.ts`. No React Query in app code.
- **Forms**: react-hook-form + Zod validation.
- **Path alias**: `@/` → `src/`.
- **cn() utility**: `import { cn } from "@/lib/utils"` (clsx + tailwind-merge).

## Gotchas

- **pgvector must exist before first `drizzle-kit push`**: Run `CREATE EXTENSION IF NOT EXISTS vector;` on any fresh database before pushing schema.
- **pnpm only**: A preinstall guard blocks npm and yarn. Always use `pnpm`.
- **Generated files are read-only**: `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` are auto-generated. Edit `lib/api-spec/openapi.yaml` then run codegen.
- **Dev secrets auto-generate**: `JWT_SECRET` and `ADMIN_API_KEY` are random on each restart in development. Set them explicitly in production.
- **`DATABASE_URL` driver prefix**: The Python backend automatically converts `postgres://` and `postgresql://` to `postgresql+asyncpg://`.
- **Telegram webhook registration**: When `telegram_token` is updated via `PUT /settings`, the backend auto-calls `setWebhook` at Telegram's API if `PUBLIC_API_URL` is set.
- **Always 200 from Telegram webhook**: The `/telegram/webhook` endpoint always returns `{"ok": true}` to prevent Telegram retry loops, even on errors.
