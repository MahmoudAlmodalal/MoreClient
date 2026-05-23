import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";
import type { SupportTicket, SupportMessage, Prisma } from "@prisma/client";
import type { PrincipalContext } from "@/server/core/auth";
import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.string().min(2).max(50),
  body: z.string().min(10).max(10000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const replyTicketSchema = z.object({
  body: z.string().min(1).max(10000),
});

export const assignTicketSchema = z.object({
  adminClerkUserId: z.string(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;

export async function createTicket(
  ctx: PrincipalContext,
  input: CreateTicketInput,
): Promise<SupportTicket & { messages: SupportMessage[] }> {
  const openerType =
    ctx.type === "company" ? "company_user" : ctx.type === "talent" ? "talent" : "admin";
  const openerId = ctx.clerkUserId;

  const ticket = await prisma.supportTicket.create({
    data: {
      id: generateId(),
      openerType,
      openerId,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: "open",
    },
    include: { messages: true },
  });

  // Create initial message
  await prisma.supportMessage.create({
    data: {
      id: generateId(),
      ticketId: ticket.id,
      senderType: openerType,
      senderId: openerId,
      body: input.body,
    },
  });

  return { ...ticket, messages: await prisma.supportMessage.findMany({ where: { ticketId: ticket.id } }) };
}

export async function listTickets(opts: {
  status?: "open" | "in_progress" | "waiting_user" | "closed";
  assignedTo?: string;
  openerId?: string;
  cursor?: string;
  limit?: number;
  isAdmin?: boolean;
}) {
  const limit = opts.limit ?? 30;
  const where: Prisma.SupportTicketWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.assignedTo ? { assignedTo: opts.assignedTo } : {}),
    ...(opts.openerId ? { openerId: opts.openerId } : {}),
  };

  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    const [ts] = decoded.split("__");
    where.createdAt = { lt: new Date(ts) };
  }

  const items = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { _count: { select: { messages: true } } },
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

  return { items: sliced, hasMore, nextCursor };
}

export async function getTicket(
  id: string,
  callerId?: string,
  isAdmin = false,
): Promise<SupportTicket & { messages: SupportMessage[] }> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);
  if (!isAdmin && callerId && ticket.openerId !== callerId) {
    throw new AppError("FORBIDDEN", "Access denied", 403);
  }
  return ticket;
}

export async function replyToTicket(
  ticketId: string,
  senderType: "company_user" | "talent" | "admin",
  senderId: string,
  input: ReplyTicketInput,
): Promise<SupportMessage> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);
  if (ticket.status === "closed") throw new AppError("UNPROCESSABLE", "Cannot reply to a closed ticket", 422);

  const message = await prisma.supportMessage.create({
    data: {
      id: generateId(),
      ticketId,
      senderType,
      senderId,
      body: input.body,
    },
  });

  // Update ticket status based on who replied
  const newStatus = senderType === "admin" ? "waiting_user" : "in_progress";
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: newStatus, updatedAt: new Date() },
  });

  return message;
}

export async function assignTicket(
  ticketId: string,
  adminClerkUserId: string,
): Promise<SupportTicket> {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found", 404);

  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { assignedTo: adminClerkUserId, status: "in_progress" },
  });
}

export async function closeTicket(ticketId: string): Promise<SupportTicket> {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "closed", closedAt: new Date() },
  });
}
