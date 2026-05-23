import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { inngest } from "@/inngest/client";
import { logger } from "@/server/core/logger";
import type { PrincipalContext } from "@/server/core/auth";

export async function requestDataExport(ctx: PrincipalContext): Promise<{ jobId: string; message: string }> {
  const principalType = ctx.type === "company" ? "company" : ctx.type === "talent" ? "talent" : null;
  if (!principalType) throw new AppError("FORBIDDEN", "Admin accounts cannot request data exports", 403);

  const principalId = ctx.type === "company" ? ctx.company.id : ctx.type === "talent" ? ctx.talent.id : null;
  if (!principalId) throw new AppError("FORBIDDEN", "Access denied", 403);

  const event = await inngest.send({
    name: "gdpr/export-requested",
    data: {
      principalType,
      principalId,
      clerkUserId: ctx.clerkUserId,
      requestedAt: new Date().toISOString(),
    },
  });

  logger.info({ principalType, principalId }, "GDPR data export requested");
  return { jobId: event.ids[0] ?? "queued", message: "Your data export has been queued. You will receive a download link within 72 hours." };
}

export async function deleteAccount(ctx: PrincipalContext): Promise<{ message: string }> {
  const principalType = ctx.type === "company" ? "company" : ctx.type === "talent" ? "talent" : null;
  if (!principalType) throw new AppError("FORBIDDEN", "Admin accounts cannot be self-deleted", 403);

  const principalId = ctx.type === "company" ? ctx.company.id : ctx.type === "talent" ? ctx.talent.id : null;
  if (!principalId) throw new AppError("FORBIDDEN", "Access denied", 403);

  // Fire Inngest job for hard-delete cascade (Postgres + Pinecone + R2 + Stripe + Clerk)
  await inngest.send({
    name: "gdpr/account-deletion-requested",
    data: {
      principalType,
      principalId,
      clerkUserId: ctx.clerkUserId,
      requestedAt: new Date().toISOString(),
    },
  });

  // Soft-delete immediately so account is inaccessible
  if (principalType === "company") {
    await prisma.company.update({
      where: { id: principalId },
      data: { deletedAt: new Date(), status: "closed" },
    });
  } else {
    await prisma.talent.update({
      where: { id: principalId },
      data: { deletedAt: new Date(), status: "banned" },
    });
  }

  logger.info({ principalType, principalId }, "GDPR account deletion initiated");
  return { message: "Your account has been scheduled for deletion. All data will be permanently removed within 30 days." };
}
