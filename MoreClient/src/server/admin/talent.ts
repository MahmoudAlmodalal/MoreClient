import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";
import { writeAudit } from "@/server/audit/index";
import { inngest } from "@/inngest/client";
import type { Talent, Prisma } from "@prisma/client";
import type { AuditContext } from "@/server/audit/index";
import { z } from "zod";

export const listTalentSchema = z.object({
  status: z.enum(["active", "suspended", "banned", "paused"]).optional(),
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  country: z.string().length(2).optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListTalentQuery = z.infer<typeof listTalentSchema>;

export async function adminListTalent(query: ListTalentQuery) {
  const { status, verificationStatus, country, q, cursor, limit } = query;

  const where: Prisma.TalentWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(country ? { country } : {}),
    ...(q ? {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { handle: { contains: q, mode: "insensitive" } },
      ],
    } : {}),
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    const [ts] = decoded.split("__");
    where.createdAt = { lt: new Date(ts) };
  }

  const items = await prisma.talent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true, handle: true, displayName: true, headline: true, avatarUrl: true,
      country: true, status: true, verificationStatus: true, planCode: true,
      featuredUntil: true, createdAt: true, payoutsEnabled: true,
      _count: { select: { proposals: true, contracts: true } },
    },
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

  return { items: sliced, hasMore, nextCursor };
}

export async function adminGetTalent(id: string) {
  const talent = await prisma.talent.findUnique({
    where: { id },
    include: {
      skills: { include: { skill: true } },
      _count: { select: { proposals: true, contracts: true } },
    },
  });
  if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);
  return talent;
}

export async function adminVerifyTalent(
  id: string,
  decision: "verified" | "rejected",
  auditCtx: AuditContext,
): Promise<Talent> {
  const talent = await prisma.talent.update({
    where: { id },
    data: { verificationStatus: decision },
  });
  await writeAudit(auditCtx, `talent.verification.${decision}`, "talent", id);
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: `talent.verification.${decision}`, payload: { id } },
  });
  return talent;
}

export async function adminFeatureTalent(
  id: string,
  featuredUntil: Date | null,
  auditCtx: AuditContext,
): Promise<Talent> {
  const talent = await prisma.talent.update({
    where: { id },
    data: { featuredUntil },
  });
  await writeAudit(auditCtx, "talent.featured", "talent", id, { featuredUntil });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "talent.featured", payload: { id, featuredUntil } },
  });
  return talent;
}

export async function adminSuspendTalent(
  id: string,
  reason: string,
  auditCtx: AuditContext,
): Promise<Talent> {
  const talent = await prisma.talent.update({
    where: { id },
    data: { status: "suspended", suspendedAt: new Date(), suspendedReason: reason },
  });
  await writeAudit(auditCtx, "talent.suspended", "talent", id, { reason });
  await inngest.send({ name: "admin/action-taken", data: { action: "suspend", targetType: "talent", targetId: id, reason } });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "talent.suspended", payload: { id, reason } },
  });
  return talent;
}

export async function adminBanTalent(
  id: string,
  reason: string,
  auditCtx: AuditContext,
): Promise<Talent> {
  const talent = await prisma.talent.update({
    where: { id },
    data: { status: "banned", suspendedAt: new Date(), suspendedReason: reason },
  });
  await writeAudit(auditCtx, "talent.banned", "talent", id, { reason });
  await inngest.send({ name: "admin/action-taken", data: { action: "ban", targetType: "talent", targetId: id, reason } });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "talent.banned", payload: { id, reason } },
  });
  return talent;
}
