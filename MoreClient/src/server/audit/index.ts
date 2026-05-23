import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import type { SenderType, PrincipalType } from "@prisma/client";
import type { PrincipalContext } from "../core/auth";

export interface AuditContext {
  actorType: SenderType;
  actorId: string;
  principalType?: PrincipalType;
  principalId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Build an AuditContext from a resolved PrincipalContext.
 */
export function auditContextFromPrincipal(
  ctx: PrincipalContext,
  request?: Request,
): AuditContext {
  const ipAddress = request?.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = request?.headers.get("user-agent") ?? undefined;

  if (ctx.type === "company") {
    return {
      actorType: "company_user",
      actorId: ctx.clerkUserId,
      principalType: "company",
      principalId: ctx.company.id,
      ipAddress,
      userAgent,
    };
  }

  if (ctx.type === "talent") {
    return {
      actorType: "talent",
      actorId: ctx.clerkUserId,
      principalType: "talent",
      principalId: ctx.talent.id,
      ipAddress,
      userAgent,
    };
  }

  return {
    actorType: "admin",
    actorId: ctx.clerkUserId,
    ipAddress,
    userAgent,
  };
}

/**
 * Write a structured audit log entry.
 * Fire-and-forget — never throws to avoid disrupting the main request.
 */
export async function writeAudit(
  auditCtx: AuditContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: generateId(),
        actorType: auditCtx.actorType,
        actorId: auditCtx.actorId,
        principalType: auditCtx.principalType,
        principalId: auditCtx.principalId,
        action,
        resourceType,
        resourceId,
        metadata: metadata as object | undefined,
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      },
    });
  } catch {
    // Audit log failures must not break user-facing requests
  }
}
