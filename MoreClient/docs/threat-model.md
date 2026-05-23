# clientMORE Threat Model

**Last updated:** 2026-05-23  
**Scope:** MoreClient monolith (Next.js 16, Prisma/PostgreSQL, Clerk, Stripe Connect, Pinecone, Cloudflare R2, Pusher Channels, Upstash Redis, Inngest)

---

## 1. Assets & Trust Boundaries

| Asset | Sensitivity | Location |
|---|---|---|
| Talent PII (name, country, bank details) | Critical | PostgreSQL + Stripe Connect |
| Company PII (legal name, billing) | Critical | PostgreSQL + Stripe |
| Contract & milestone funds | Critical | Stripe escrow |
| AI embeddings (profile/job) | High | Pinecone namespaced by principal |
| Message content | High | PostgreSQL |
| Portfolio media | Medium | Cloudflare R2 |
| Clerk JWTs / session tokens | Critical | Client-side / Clerk CDN |
| Admin credentials | Critical | Clerk + PlatformAdmin table |

**Trust boundaries:**  
- Clerk ↔ MoreClient API (JWT, org membership)  
- MoreClient API ↔ Stripe (webhook HMAC, mTLS)  
- MoreClient API ↔ R2 (AWS SigV4 signed URLs)  
- Inngest ↔ MoreClient (`/api/inngest` signing key)  

---

## 2. Threat Actors

| Actor | Capability |
|---|---|
| Unauthenticated attacker | Public internet, automated scanners |
| Authenticated talent | Valid Clerk JWT, own data only |
| Authenticated company user | Clerk org JWT, company-scoped data |
| Compromised principal | Stolen Clerk session token |
| Malicious AI prompt | Crafted user content sent to LLM |
| Rogue admin | Internal — PlatformAdmin with elevated role |

---

## 3. Threat Catalogue (STRIDE)

### 3.1 Spoofing

| ID | Threat | Mitigation |
|---|---|---|
| S-01 | Forged Clerk JWT to impersonate another user | `auth()` SDK validates RS256 signature against Clerk JWKS; `requirePrincipal` enforces DB lookup |
| S-02 | Replayed Stripe webhook | HMAC-SHA256 verification via `constructStripeEvent`; timestamp tolerance ≤300 s |
| S-03 | Forged Inngest events | Inngest signing key validated on every delivery; `x-inngest-signature` header |
| S-04 | Spoofed `principalId` in Inngest payload | All GDPR/billing Inngest functions re-derive principal from DB before acting |

### 3.2 Tampering

| ID | Threat | Mitigation |
|---|---|---|
| T-01 | SQL injection via Prisma inputs | Prisma parameterised queries; no raw SQL with user input |
| T-02 | Bid/milestone amount manipulation | `bidAmount` and milestone `amount` validated as positive integers; server-side Stripe checkout creates price server-side |
| T-03 | Featured placement activated without payment | `activateFeaturedPlacement` only called from verified `checkout.session.completed` webhook event |
| T-04 | R2 object key traversal | `storageKey()` scopes all keys to `{type}/{principalId}/`; presigned URLs are write-only PUT |
| T-05 | Profile embedding poisoning | Embedding generated from server-controlled fields only; no user-supplied vector |

### 3.3 Repudiation

| ID | Threat | Mitigation |
|---|---|---|
| R-01 | Admin denies taking moderation action | `AuditLog` + `AdminActivity` written on every admin mutation; `writeAudit` is fire-and-forget but non-blocking |
| R-02 | Principal denies contract signature | `signedAtCompany` / `signedAtTalent` timestamps stored; future phase: DocuSign envelope |

### 3.4 Information Disclosure

| ID | Threat | Mitigation |
|---|---|---|
| I-01 | Talent PII exposed in public profile | `getTalentProfile` only returns fields explicitly selected; `searchVisibility: hidden` excluded from query |
| I-02 | Cross-tenant data leak in company routes | `requireRole` enforces company scope; all queries filter by `companyId` from auth context |
| I-03 | AI model exfiltrates system prompt | `filterAiOutput` scans responses; output streamed only after filter pass |
| I-04 | R2 private objects accessible without auth | Presigned URLs expire in 900 s; no public bucket policy |
| I-05 | Pinecone cross-namespace data leak | Each principal uses its own namespace; queries scoped to namespace |
| I-06 | Error responses leaking stack traces | `toProblemJson` never includes stack; structured error codes only |

### 3.5 Denial of Service

| ID | Threat | Mitigation |
|---|---|---|
| D-01 | Brute-force auth | Clerk rate-limits sign-in attempts; Upstash Redis sliding-window rate limiter on all API routes |
| D-02 | AI cost exhaustion via chat endpoint | `UsageCounter.aiChatTokensInput` tracked; plan quotas enforced by `checkEntitlement` |
| D-03 | File upload DoS (giant file) | `validateUpload` enforces per-plan `maxSizeBytes` before any write to R2 |
| D-04 | Pinecone query DoS | Rate limiter covers `/api/v1/ai/search`; Pinecone serverless auto-scales |
| D-05 | Inngest fan-out storm | Inngest concurrency limits configured per function; idempotency keys on re-queued events |

### 3.6 Elevation of Privilege

| ID | Threat | Mitigation |
|---|---|---|
| E-01 | Talent accesses company admin routes | `requireAdmin` checks `PlatformAdmin` table; company-scoped routes use `requireRole` |
| E-02 | Viewer promotes self to owner | `companyRoleAtLeast` enforced on member mutation; role changes require caller ≥ admin |
| E-03 | Support admin executes super_admin action | `adminRoleAtLeast` checked per action; ban/hard-delete require `super_admin` |
| E-04 | Prompt injection to override AI guardrails | `scanUserInput` blocks known patterns; content wrapped in `wrapUserContent` role markers; structured JSON schema validated via `parseAiJsonOutput` |

---

## 4. Out-of-Scope (Phase 5)

- Email/SMS phishing against end users (mitigated by Clerk MFA, documented for Phase 6)  
- Mobile client (not built yet)  
- DDoS at CDN layer (Cloudflare in front of Replit VM handles this)  
- Insider threat from Replit infrastructure (supply-chain, out of scope for app-layer model)

---

## 5. Residual Risks & Phase 6 Actions

| Risk | Owner | Target Phase |
|---|---|---|
| No DKIM/DMARC for transactional email | Infra | Phase 6 (Resend) |
| No MFA enforcement for admin accounts | Clerk config | Phase 6 |
| No contract signing audit trail beyond timestamps | Product | Phase 6 (DocuSign) |
| AI output not content-addressed (prompt drift) | AI team | Phase 6 |
| BetterStack synthetic monitors not yet active | Infra | Phase 6 |
