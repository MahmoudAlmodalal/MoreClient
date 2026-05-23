import { MessagingRepo, type ThreadWithLastMessage } from "./repo";
import { AppError } from "../core/errors";
import { inngest } from "@/inngest/client";
import { prisma } from "../core/db";
import { logger } from "../core/logger";
import type { Thread, Message } from "@prisma/client";
import type { CompanyContext, TalentContext } from "../core/auth";
import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(10000),
  attachments: z.array(z.string().url()).max(10).default([]),
});

export const startThreadSchema = z.object({
  companyId: z.string().uuid(),
  talentId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  body: z.string().min(1).max(10000),
  attachments: z.array(z.string().url()).max(10).default([]),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type StartThreadInput = z.infer<typeof startThreadSchema>;

export class MessagingService {
  /** Get or create a thread between company and talent. Company-initiated only. */
  static async startThread(
    ctx: CompanyContext,
    input: StartThreadInput,
  ): Promise<{ thread: Thread; message: Message }> {
    if (input.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const talent = await prisma.talent.findUnique({
      where: { id: input.talentId, deletedAt: null, status: "active" },
      select: { id: true, clerkUserId: true },
    });
    if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);

    const thread = await MessagingRepo.findOrCreateThread(
      input.companyId,
      input.talentId,
      input.jobId,
    );

    const message = await MessagingRepo.createMessage(
      thread.id,
      "company_user",
      ctx.clerkUserId,
      input.body,
      input.attachments,
    );

    await inngest.send({
      name: "message/created",
      data: {
        messageId: message.id,
        threadId: thread.id,
        senderType: "company_user",
        senderId: ctx.clerkUserId,
        recipientClerkUserId: talent.clerkUserId,
      },
    });

    logger.info({ threadId: thread.id, messageId: message.id }, "thread started");
    return { thread, message };
  }

  /** Send a message in an existing thread. */
  static async sendMessage(
    ctx: CompanyContext | TalentContext,
    threadId: string,
    input: SendMessageInput,
  ): Promise<Message> {
    const thread = await MessagingRepo.findThreadById(threadId);
    if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);

    // Access control: only the company or talent in the thread
    if (ctx.type === "company" && thread.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (ctx.type === "talent" && thread.talentId !== ctx.talent.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const senderType = ctx.type === "company" ? "company_user" : "talent";

    // Find recipient clerk user ID for Pusher notification
    let recipientClerkUserId: string;
    if (ctx.type === "company") {
      const talent = await prisma.talent.findUnique({
        where: { id: thread.talentId },
        select: { clerkUserId: true },
      });
      recipientClerkUserId = talent?.clerkUserId ?? thread.talentId;
    } else {
      const company = await prisma.company.findUnique({
        where: { id: thread.companyId },
        select: { users: { take: 1, select: { clerkUserId: true } } },
      });
      recipientClerkUserId = company?.users[0]?.clerkUserId ?? thread.companyId;
    }

    const message = await MessagingRepo.createMessage(
      threadId,
      senderType as import("@prisma/client").SenderType,
      ctx.type === "company" ? ctx.clerkUserId : ctx.clerkUserId,
      input.body,
      input.attachments,
    );

    await inngest.send({
      name: "message/created",
      data: {
        messageId: message.id,
        threadId,
        senderType,
        senderId: ctx.clerkUserId,
        recipientClerkUserId,
      },
    });

    return message;
  }

  static async listThreads(
    ctx: CompanyContext | TalentContext,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: ThreadWithLastMessage[]; hasMore: boolean; nextCursor: string | null }> {
    if (ctx.type === "company") {
      return MessagingRepo.listThreadsForCompany(ctx.company.id, opts);
    }
    return MessagingRepo.listThreadsForTalent(ctx.talent.id, opts);
  }

  static async listMessages(
    ctx: CompanyContext | TalentContext,
    threadId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<{ items: Message[]; hasMore: boolean; nextCursor: string | null }> {
    const thread = await MessagingRepo.findThreadById(threadId);
    if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);

    if (ctx.type === "company" && thread.companyId !== ctx.company.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    if (ctx.type === "talent" && thread.talentId !== ctx.talent.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    // Mark messages as read on fetch
    const readerId = ctx.clerkUserId;
    MessagingRepo.markThreadRead(threadId, readerId).catch(() => {});

    return MessagingRepo.listMessages(threadId, opts);
  }
}
