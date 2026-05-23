import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import { encodeCursor, decodeCursor } from "../core/pagination";
import type { Thread, Message, Prisma, SenderType } from "@prisma/client";

export type ThreadWithLastMessage = Thread & {
  messages: Pick<Message, "id" | "body" | "senderType" | "senderId" | "createdAt" | "moderationStatus">[];
};

export class MessagingRepo {
  // ─── Threads ───────────────────────────────────────────────────────────────

  static async findOrCreateThread(
    companyId: string,
    talentId: string,
    jobId?: string,
  ): Promise<Thread> {
    const existing = await prisma.thread.findFirst({
      where: { companyId, talentId, jobId: jobId ?? null },
    });
    if (existing) return existing;

    return prisma.thread.create({
      data: {
        id: generateId(),
        companyId,
        talentId,
        jobId: jobId ?? null,
      },
    });
  }

  static async findThreadById(id: string): Promise<Thread | null> {
    return prisma.thread.findUnique({ where: { id } });
  }

  static async listThreadsForCompany(
    companyId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: ThreadWithLastMessage[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = opts.limit ?? 20;
    const where: Prisma.ThreadWhereInput = { companyId };

    if (opts.cursor) {
      const decoded = decodeCursor(opts.cursor);
      const [ts] = decoded.split("__");
      where.lastMessageAt = { lt: new Date(ts) };
    }

    const items = await prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, senderType: true, senderId: true, createdAt: true, moderationStatus: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last?.lastMessageAt
        ? encodeCursor(`${last.lastMessageAt.toISOString()}__${last.id}`)
        : null;

    return { items: sliced, hasMore, nextCursor };
  }

  static async listThreadsForTalent(
    talentId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: ThreadWithLastMessage[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = opts.limit ?? 20;
    const where: Prisma.ThreadWhereInput = { talentId };

    if (opts.cursor) {
      const decoded = decodeCursor(opts.cursor);
      const [ts] = decoded.split("__");
      where.lastMessageAt = { lt: new Date(ts) };
    }

    const items = await prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, senderType: true, senderId: true, createdAt: true, moderationStatus: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last?.lastMessageAt
        ? encodeCursor(`${last.lastMessageAt.toISOString()}__${last.id}`)
        : null;

    return { items: sliced, hasMore, nextCursor };
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  static async createMessage(
    threadId: string,
    senderType: SenderType,
    senderId: string,
    body: string,
    attachments: string[] = [],
  ): Promise<Message> {
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          id: generateId(),
          threadId,
          senderType,
          senderId,
          body,
          attachments,
          moderationStatus: "pending",
        },
      }),
      prisma.thread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }

  static async listMessages(
    threadId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: Message[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = opts.limit ?? 50;
    const where: Prisma.MessageWhereInput = { threadId };

    if (opts.cursor) {
      const decoded = decodeCursor(opts.cursor);
      const [ts] = decoded.split("__");
      where.createdAt = { lt: new Date(ts) };
    }

    const items = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`)
        : null;

    return { items: sliced, hasMore, nextCursor };
  }

  static async markRead(messageId: string): Promise<void> {
    await prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  static async markThreadRead(threadId: string, readerSenderId: string): Promise<void> {
    await prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: readerSenderId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
}
