import crypto from "node:crypto";
import type { ReactElement } from "react";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { sendEmail } from "@/server/core/email";
import { NotificationRepo, type CreateNotificationInput } from "./repo";
import type { Notification, PrincipalType } from "@prisma/client";

export interface NotifyArgs extends CreateNotificationInput {
  /** Optional email to send alongside the in-app notification. */
  email?: { subject: string; react: ReactElement };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clientmore.com";

function unsubscribeSecret(): string {
  return process.env.NOTIFICATION_UNSUBSCRIBE_SECRET ?? process.env.CLERK_SECRET_KEY ?? "dev-unsubscribe-secret";
}

/** Mint a tamper-proof unsubscribe token for a principal (digest opt-out). */
export function mintUnsubscribeToken(principalType: PrincipalType, principalId: string): string {
  const payload = `${principalType}:${principalId}`;
  const sig = crypto.createHmac("sha256", unsubscribeSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { principalType: PrincipalType; principalId: string } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", unsubscribeSecret()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [principalType, principalId] = payload.split(":");
  if ((principalType !== "company" && principalType !== "talent") || !principalId) return null;
  return { principalType, principalId };
}

export function unsubscribeUrl(principalType: PrincipalType, principalId: string): string {
  return `${APP_URL}/api/v1/notifications/unsubscribe?token=${mintUnsubscribeToken(principalType, principalId)}`;
}

/**
 * Resolve recipient email addresses for a principal, honoring the `notifyEmail`
 * opt-out. Companies notify their owner/admin users; talent notify themselves.
 */
async function resolveRecipients(
  principalType: PrincipalType,
  principalId: string,
): Promise<{ optedIn: boolean; clerkUserIds: string[] }> {
  if (principalType === "talent") {
    const talent = await prisma.talent.findUnique({
      where: { id: principalId },
      select: { clerkUserId: true, notifyEmail: true },
    });
    if (!talent) return { optedIn: false, clerkUserIds: [] };
    return { optedIn: talent.notifyEmail, clerkUserIds: [talent.clerkUserId] };
  }

  const company = await prisma.company.findUnique({
    where: { id: principalId },
    select: { notifyEmail: true, users: { where: { role: { in: ["owner", "admin"] } }, select: { clerkUserId: true } } },
  });
  if (!company) return { optedIn: false, clerkUserIds: [] };
  return { optedIn: company.notifyEmail, clerkUserIds: company.users.map((u) => u.clerkUserId) };
}

export async function emailForClerkUser(clerkUserId: string): Promise<string | null> {
  try {
    const { createClerkClient } = await import("@clerk/nextjs/server");
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(clerkUserId);
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    logger.warn({ clerkUserId }, "could not resolve email from Clerk for notification");
    return null;
  }
}

/**
 * Single entry point used by Inngest functions: writes an in-app notification
 * and, when an email payload is supplied and the principal hasn't opted out,
 * delivers it. Never throws on email failure.
 */
export async function notify(args: NotifyArgs): Promise<Notification> {
  const { email, ...notificationInput } = args;
  const notification = await NotificationRepo.create(notificationInput);

  if (email) {
    const { optedIn, clerkUserIds } = await resolveRecipients(args.principalType, args.principalId);
    if (optedIn && clerkUserIds.length) {
      for (const clerkUserId of clerkUserIds) {
        const to = await emailForClerkUser(clerkUserId);
        if (to) await sendEmail({ to, subject: email.subject, react: email.react });
      }
    }
  }

  return notification;
}

export async function listNotifications(opts: {
  principalType: PrincipalType;
  principalId: string;
  cursor?: string;
  limit: number;
}) {
  const [page, unreadCount] = await Promise.all([
    NotificationRepo.listForPrincipal(opts),
    NotificationRepo.countUnread(opts.principalType, opts.principalId),
  ]);
  return { ...page, unreadCount };
}

export async function markAllRead(principalType: PrincipalType, principalId: string): Promise<number> {
  return NotificationRepo.markAllRead(principalType, principalId);
}

export const NotificationService = {
  notify,
  listNotifications,
  markAllRead,
  mintUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
};
