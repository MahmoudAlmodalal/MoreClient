import { prisma } from "@/server/core/db";
import { generateId } from "@/server/core/ids";
import { decodeCursor, paginate, type PaginatedResponse } from "@/server/core/pagination";
import type { Notification, PrincipalType, SenderType, Prisma } from "@prisma/client";

export interface CreateNotificationInput {
  principalType: PrincipalType;
  principalId: string;
  eventType: string;
  title: string;
  body?: string | null;
  actorType?: SenderType | null;
  actorId?: string | null;
  data?: Prisma.InputJsonValue;
  linkUrl?: string | null;
}

export class NotificationRepo {
  static async create(input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        id: generateId(),
        principalType: input.principalType,
        principalId: input.principalId,
        eventType: input.eventType,
        title: input.title,
        body: input.body ?? null,
        actorType: input.actorType ?? null,
        actorId: input.actorId ?? null,
        data: input.data,
        linkUrl: input.linkUrl ?? null,
      },
    });
  }

  static async listForPrincipal(opts: {
    principalType: PrincipalType;
    principalId: string;
    cursor?: string;
    limit: number;
  }): Promise<PaginatedResponse<Notification>> {
    const where: Prisma.NotificationWhereInput = {
      principalType: opts.principalType,
      principalId: opts.principalId,
    };

    if (opts.cursor) {
      const [ts] = decodeCursor(opts.cursor).split("__");
      where.createdAt = { lt: new Date(ts) };
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit + 1,
    });

    return paginate(items, opts.limit);
  }

  static async countUnread(principalType: PrincipalType, principalId: string): Promise<number> {
    return prisma.notification.count({
      where: { principalType, principalId, readAt: null },
    });
  }

  static async markAllRead(principalType: PrincipalType, principalId: string): Promise<number> {
    const res = await prisma.notification.updateMany({
      where: { principalType, principalId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}
