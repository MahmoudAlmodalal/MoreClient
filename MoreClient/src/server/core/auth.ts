import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import type { Company, CompanyUser, Talent, PlatformAdmin } from "@prisma/client";
import { prisma } from "./db";
import { AppError } from "./errors";
import { companyRoleAtLeast, adminRoleAtLeast } from "./rbac";
import { resolvePrincipalFromApiKey, API_KEY_PREFIX } from "@/server/apikeys/service";
import type { CompanyRole, AdminRole } from "@prisma/client";

/** Extract a `Bearer mc_…` API key token from the request, if present. */
async function readApiKeyBearer(): Promise<string | null> {
  try {
    const authHeader = (await headers()).get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    return token.startsWith(API_KEY_PREFIX) ? token : null;
  } catch {
    return null;
  }
}

// ─── Context Types ────────────────────────────────────────────────────────────

export interface CompanyContext {
  type: "company";
  company: Company;
  companyUser: CompanyUser;
  clerkUserId: string;
  orgId: string;
  admin: PlatformAdmin | null;
}

export interface TalentContext {
  type: "talent";
  talent: Talent;
  clerkUserId: string;
  admin: PlatformAdmin | null;
}

export interface AdminOnlyContext {
  type: "admin";
  admin: PlatformAdmin;
  clerkUserId: string;
}

export type PrincipalContext = CompanyContext | TalentContext | AdminOnlyContext;

// ─── Principal Resolver ───────────────────────────────────────────────────────

/**
 * Resolve the calling user's principal from the Clerk JWT.
 * Returns null if the user is not authenticated.
 */
export async function resolvePrincipal(): Promise<PrincipalContext | null> {
  // Third-party API key authentication takes precedence over the Clerk session.
  // The resolver enforces the per-key rate limit and throws on excess.
  const bearer = await readApiKeyBearer();
  if (bearer) {
    return resolvePrincipalFromApiKey(bearer);
  }

  let session: Awaited<ReturnType<typeof auth>>;
  try {
    session = await auth();
  } catch {
    return null;
  }

  const { userId, orgId } = session;
  if (!userId) return null;

  const admin = await prisma.platformAdmin.findUnique({
    where: { clerkUserId: userId, active: true },
  });

  if (orgId) {
    const company = await prisma.company.findFirst({
      where: { clerkOrgId: orgId, deletedAt: null },
    });
    if (!company) return null;

    const companyUser = await prisma.companyUser.findUnique({
      where: {
        companyId_clerkUserId: { companyId: company.id, clerkUserId: userId },
      },
    });
    if (!companyUser) return null;

    return {
      type: "company",
      company,
      companyUser,
      clerkUserId: userId,
      orgId,
      admin,
    };
  }

  const talent = await prisma.talent.findUnique({
    where: { clerkUserId: userId, deletedAt: null },
  });

  if (talent) {
    return { type: "talent", talent, clerkUserId: userId, admin };
  }

  if (admin) {
    return { type: "admin", admin, clerkUserId: userId };
  }

  return null;
}

// ─── Auth Guards ──────────────────────────────────────────────────────────────

/**
 * Require an authenticated principal of one of the given types.
 * Throws 401 if not authenticated, 403 if wrong principal type.
 */
export async function requirePrincipal(
  allowedTypes?: Array<"company" | "talent">,
): Promise<PrincipalContext> {
  const ctx = await resolvePrincipal();

  if (!ctx) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  if (allowedTypes && ctx.type !== "admin") {
    if (!allowedTypes.includes(ctx.type as "company" | "talent")) {
      throw new AppError(
        "FORBIDDEN",
        `This action requires a ${allowedTypes.join(" or ")} account`,
        403,
      );
    }
  }

  return ctx;
}

/**
 * Require the caller to be a company user with at least the given role.
 */
export async function requireRole(minRole: CompanyRole): Promise<CompanyContext> {
  const ctx = await requirePrincipal(["company"]);

  if (ctx.type !== "company") {
    throw new AppError("FORBIDDEN", "Company account required", 403);
  }

  if (!companyRoleAtLeast(ctx.companyUser.role, minRole)) {
    throw new AppError(
      "FORBIDDEN",
      `This action requires at least the '${minRole}' role`,
      403,
    );
  }

  return ctx;
}

/**
 * Require the caller to be a platform admin with at least the given role.
 */
export async function requireAdmin(minRole: AdminRole = "support"): Promise<PlatformAdmin> {
  const ctx = await resolvePrincipal();

  if (!ctx?.admin) {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }

  if (!adminRoleAtLeast(ctx.admin.role, minRole)) {
    throw new AppError(
      "FORBIDDEN",
      `This action requires at least the '${minRole}' admin role`,
      403,
    );
  }

  return ctx.admin;
}

/**
 * Require the caller to own the given resource (by comparing principalId).
 */
export async function requireOwnership(
  resourcePrincipalId: string,
): Promise<PrincipalContext> {
  const ctx = await requirePrincipal();

  if (ctx.type === "admin") return ctx;

  const callerPrincipalId =
    ctx.type === "company" ? ctx.company.id : ctx.talent.id;

  if (callerPrincipalId !== resourcePrincipalId) {
    throw new AppError("FORBIDDEN", "You do not own this resource", 403);
  }

  return ctx;
}
