import crypto from "node:crypto";
import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { checkRateLimit } from "@/server/core/rate-limit";
import { ApiKeyRepo } from "./repo";
import type { ApiKey, PrincipalType } from "@prisma/client";
import type { PrincipalContext } from "@/server/core/auth";

const KEY_BYTES = 24;
const PREFIX_LEN = 8;
export const API_KEY_PREFIX = "mc_";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Public-safe view of an API key (never exposes the hash or full secret). */
export interface ApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

function toView(k: ApiKey): ApiKeyView {
  return {
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
    createdAt: k.createdAt,
  };
}

function principalIdentity(ctx: PrincipalContext): { principalType: PrincipalType; principalId: string } {
  if (ctx.type === "company") return { principalType: "company", principalId: ctx.company.id };
  if (ctx.type === "talent") return { principalType: "talent", principalId: ctx.talent.id };
  throw new AppError("FORBIDDEN", "API keys are only available to company and talent accounts", 403);
}

/** Create a new API key. The full secret is returned exactly once. */
export async function createApiKey(ctx: PrincipalContext, name: string): Promise<{ key: ApiKey; secret: string; view: ApiKeyView }> {
  const { principalType, principalId } = principalIdentity(ctx);

  const random = crypto.randomBytes(KEY_BYTES).toString("base64url");
  const secret = `${API_KEY_PREFIX}${random}`;
  const keyPrefix = random.slice(0, PREFIX_LEN);
  const keyHash = sha256(secret);

  const key = await ApiKeyRepo.create({ principalType, principalId, keyPrefix, keyHash, name });
  return { key, secret, view: toView(key) };
}

export async function listApiKeys(ctx: PrincipalContext): Promise<ApiKeyView[]> {
  const { principalType, principalId } = principalIdentity(ctx);
  const keys = await ApiKeyRepo.listForPrincipal(principalType, principalId);
  return keys.map(toView);
}

export async function revokeApiKey(ctx: PrincipalContext, id: string): Promise<void> {
  const { principalType, principalId } = principalIdentity(ctx);
  const key = await ApiKeyRepo.findById(id);
  if (!key || key.principalType !== principalType || key.principalId !== principalId) {
    throw new AppError("NOT_FOUND", "API key not found", 404);
  }
  await ApiKeyRepo.revoke(id);
}

/**
 * Resolve a `Bearer mc_…` token to a PrincipalContext (company or talent only).
 * Returns null when the token is malformed, unknown, or revoked.
 */
export async function resolvePrincipalFromApiKey(bearer: string): Promise<PrincipalContext | null> {
  if (!bearer.startsWith(API_KEY_PREFIX)) return null;
  const random = bearer.slice(API_KEY_PREFIX.length);
  if (random.length <= PREFIX_LEN) return null;

  const keyPrefix = random.slice(0, PREFIX_LEN);
  const candidates = await ApiKeyRepo.findActiveByPrefix(keyPrefix);
  if (!candidates.length) return null;

  const hash = sha256(bearer);
  const hashBuf = Buffer.from(hash);
  const match = candidates.find(
    (c) => c.keyHash.length === hash.length && crypto.timingSafeEqual(Buffer.from(c.keyHash), hashBuf),
  );
  if (!match) return null;

  // Per-key rate limit: 60 req/min. Throws AppError(RATE_LIMITED) when exceeded.
  await checkRateLimit("apiKey", `apikey:${match.id}`);

  void ApiKeyRepo.touchLastUsed(match.id);

  if (match.principalType === "talent") {
    const talent = await prisma.talent.findUnique({ where: { id: match.principalId, deletedAt: null } });
    if (!talent) return null;
    return { type: "talent", talent, clerkUserId: talent.clerkUserId, admin: null };
  }

  const company = await prisma.company.findUnique({ where: { id: match.principalId, deletedAt: null } });
  if (!company) return null;
  // Bind to the company's owner/admin user so role checks resolve to a real role.
  const companyUser = await prisma.companyUser.findFirst({
    where: { companyId: company.id, role: { in: ["owner", "admin"] } },
    orderBy: { role: "asc" },
  });
  if (!companyUser) return null;

  return {
    type: "company",
    company,
    companyUser,
    clerkUserId: companyUser.clerkUserId,
    orgId: company.clerkOrgId,
    admin: null,
  };
}

export { toView as apiKeyView };
