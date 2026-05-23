import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";
import { writeAudit } from "@/server/audit/index";
import { inngest } from "@/inngest/client";
import type { Company, Prisma } from "@prisma/client";
import type { AuditContext } from "@/server/audit/index";
import { z } from "zod";

export const listCompaniesSchema = z.object({
  status: z.enum(["active", "suspended", "banned", "closed"]).optional(),
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListCompaniesQuery = z.infer<typeof listCompaniesSchema>;

export async function adminListCompanies(query: ListCompaniesQuery) {
  const { status, verificationStatus, q, cursor, limit } = query;

  const where: Prisma.CompanyWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    const [ts] = decoded.split("__");
    where.createdAt = { lt: new Date(ts) };
  }

  const items = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { _count: { select: { jobs: true, contracts: true, users: true } } },
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

  return { items: sliced, hasMore, nextCursor };
}

export async function adminGetCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: true,
      _count: { select: { jobs: true, contracts: true } },
    },
  });
  if (!company) throw new AppError("NOT_FOUND", "Company not found", 404);
  return company;
}

export async function adminSuspendCompany(
  id: string,
  reason: string,
  auditCtx: AuditContext,
): Promise<Company> {
  const company = await prisma.company.update({
    where: { id },
    data: { status: "suspended", suspendedAt: new Date(), suspendedReason: reason },
  });
  await writeAudit(auditCtx, "company.suspended", "company", id, { reason });
  await inngest.send({ name: "admin/action-taken", data: { action: "suspend", targetType: "company", targetId: id, reason } });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "company.suspended", payload: { id, reason } },
  });
  return company;
}

export async function adminUnsuspendCompany(id: string, auditCtx: AuditContext): Promise<Company> {
  const company = await prisma.company.update({
    where: { id },
    data: { status: "active", suspendedAt: null, suspendedReason: null },
  });
  await writeAudit(auditCtx, "company.unsuspended", "company", id);
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "company.unsuspended", payload: { id } },
  });
  return company;
}

export async function adminBanCompany(
  id: string,
  reason: string,
  auditCtx: AuditContext,
): Promise<Company> {
  const company = await prisma.company.update({
    where: { id },
    data: { status: "banned", suspendedAt: new Date(), suspendedReason: reason },
  });
  await writeAudit(auditCtx, "company.banned", "company", id, { reason });
  await inngest.send({ name: "admin/action-taken", data: { action: "ban", targetType: "company", targetId: id, reason } });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: "company.banned", payload: { id, reason } },
  });
  return company;
}

export async function adminVerifyCompany(
  id: string,
  decision: "verified" | "rejected",
  auditCtx: AuditContext,
): Promise<Company> {
  const company = await prisma.company.update({
    where: { id },
    data: { verificationStatus: decision },
  });
  await writeAudit(auditCtx, `company.verification.${decision}`, "company", id);
  await inngest.send({
    name: "verification/status-changed",
    data: { principalType: "company", principalId: id, decision },
  });
  await prisma.adminActivity.create({
    data: { id: generateId(), adminId: auditCtx.actorId, action: `company.verification.${decision}`, payload: { id } },
  });
  return company;
}

// ─── Bulk operations ───────────────────────────────────────────────────────────

export const bulkCompanyActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["suspend", "unsuspend", "ban", "verify", "reject"]),
  reason: z.string().max(500).optional(),
});

export type BulkCompanyActionInput = z.infer<typeof bulkCompanyActionSchema>;

export async function adminBulkCompanyAction(input: BulkCompanyActionInput, auditCtx: AuditContext) {
  const reason = input.reason ?? `Bulk ${input.action} by admin`;
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const id of input.ids) {
    try {
      switch (input.action) {
        case "suspend":
          await adminSuspendCompany(id, reason, auditCtx);
          break;
        case "unsuspend":
          await adminUnsuspendCompany(id, auditCtx);
          break;
        case "ban":
          await adminBanCompany(id, reason, auditCtx);
          break;
        case "verify":
          await adminVerifyCompany(id, "verified", auditCtx);
          break;
        case "reject":
          await adminVerifyCompany(id, "rejected", auditCtx);
          break;
      }
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message });
    }
  }

  return { action: input.action, total: input.ids.length, succeeded: results.filter((r) => r.ok).length, results };
}

/** Fetch the full filtered company set for CSV export (capped). */
export async function adminExportCompanies(query: Omit<ListCompaniesQuery, "cursor" | "limit">) {
  const { status, verificationStatus, q } = query;
  const where: Prisma.CompanyWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
  };

  return prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true, name: true, slug: true, country: true, status: true,
      verificationStatus: true, planCode: true, createdAt: true,
    },
  });
}
