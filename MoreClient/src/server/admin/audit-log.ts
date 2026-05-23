import { prisma } from "@/server/core/db";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";
import type { AuditLog, Prisma } from "@prisma/client";
import { z } from "zod";

export const auditLogQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  principalId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export async function queryAuditLog(query: AuditLogQuery): Promise<{
  items: AuditLog[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const { actorId, action, resourceType, principalId, from, to, cursor, limit } = query;

  const where: Prisma.AuditLogWhereInput = {
    ...(actorId ? { actorId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(principalId ? { principalId } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    const [ts] = decoded.split("__");
    where.createdAt = { ...(where.createdAt as object ?? {}), lt: new Date(ts) };
  }

  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

  return { items: sliced, hasMore, nextCursor };
}
