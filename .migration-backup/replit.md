# clientMORE

B2B AI customer support SaaS — operators manage their AI support bot, knowledge base, handoffs queue, and integrations from web and mobile.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Auth env: `JWT_SECRET` (signing key) and `ADMIN_API_KEY` (sent as `X-Admin-Key` header on `/api/admin/*`). Sensible dev defaults are used if unset.
- Optional AI env: `OPENAI_API_KEY` (used for `text-embedding-3-small` and `gpt-4o-mini`) and/or `GEMINI_API_KEY` (used for `gemini-1.5-flash`). Without either, the server runs keyless — RAG falls back to lexical-only retrieval and the top chunk is returned verbatim.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/clientmore/` — Vite + React web app (operators dashboard)
- `artifacts/clientmore-mobile/` — Expo mobile app (iOS / Android / web)
- `artifacts/api-server/` — Express 5 backend (port 5000)
- `artifacts/clientmore/src/lib/api.ts` — web API client (calls Python FastAPI on :8000)
- `artifacts/clientmore-mobile/lib/api.ts` — mobile API client (mirrors web, uses AsyncStorage)
- `artifacts/clientmore-mobile/constants/colors.ts` — design tokens (dark theme)

## Architecture decisions

- Backend now lives in **Node/Express** at `artifacts/api-server` (not Python/FastAPI). DB is Postgres + Drizzle with the `pgvector` extension for hybrid RAG (vector + lexical). JWT auth for operators, `X-Admin-Key` header for the admin surface, WebSockets on `/ws/dashboard` (token-gated) and `/ws/chat/:sessionId` (widget streaming). Handoff delivery to Telegram/Twilio uses 3-attempt exponential backoff and records `delivery_status`/`attempts`/`detail`.
- Mobile mirrors the web app's manual fetch layer (`lib/api.ts`) rather than the OpenAPI codegen path, since the web's actual data calls bypass the stub openapi.yaml.
- JWT token stored in AsyncStorage on mobile (same key `"authToken"` as web's localStorage).
- Dark theme forced (`userInterfaceStyle: "dark"`) — brand colors: bg `#050508`, primary `#8b5cf6`.
- Mobile auth uses an `AuthProvider` context; unauthenticated users are redirected to the `(auth)` stack.
- Expo Router file-based routing with `(auth)/login` and `(tabs)` groups gated by token presence.

## Product

- **Web**: Marketing landing page, operator dashboard with analytics KPIs/charts, knowledge base file manager, handoffs queue with reply + resolve, settings (company, integrations, advanced). Bilingual EN/AR.
- **Mobile**: Login, Dashboard (KPIs + channel distribution + unanswered queue), Knowledge Base (list + upload + delete), Handoffs (queue with filter, inline reply, resolve), Settings (all fields + sign out).

## User preferences

- Dark theme only: bg `#050508`, card `#0d0d15`, border `#1f1f2e`, primary `#8b5cf6`.
- Bilingual support EN/AR in web app.
- Mobile targets operators (internal users), not end customers.

## Gotchas

- The Node API server replaces the previous Python FastAPI. The frontends still default their API base to localhost:8000 — point them at the new server (e.g. `EXPO_PUBLIC_API_URL=$REPLIT_DEV_DOMAIN` and `VITE_API_URL=$REPLIT_DEV_DOMAIN`, routed via the api-server's artifact prefix) when wiring them up.
- `expo-document-picker` version must match expo SDK (currently `~14.0.8` for expo ~54).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
