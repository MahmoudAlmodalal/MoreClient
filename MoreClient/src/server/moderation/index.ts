import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { encodeCursor, decodeCursor } from "@/server/core/pagination";
import { writeAudit } from "@/server/audit/index";
import { inngest } from "@/inngest/client";
import type { Report, ModerationAction, Prisma } from "@prisma/client";
import type { AuditContext } from "@/server/audit/index";
import { z } from "zod";

export const submitReportSchema = z.object({
  targetType: z.enum(["company", "talent", "message", "job", "profile"]),
  targetId: z.string().uuid(),
  category: z.enum(["spam", "fraud", "harassment", "inappropriate", "ip_violation", "other"]),
  description: z.string().min(10).max(2000),
});

export const decideModerationSchema = z.object({
  decision: z.enum(["resolved", "dismissed"]),
  action: z.enum(["warn", "suspend", "ban", "shadow_ban", "unflag"]).optional(),
  durationDays: z.number().int().positive().optional(),
  reason: z.string().min(5).max(500),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type DecideModerationInput = z.infer<typeof decideModerationSchema>;

export async function submitReport(
  reporterType: "company_user" | "talent",
  reporterId: string,
  input: SubmitReportInput,
): Promise<Report> {
  const report = await prisma.report.create({
    data: {
      id: generateId(),
      reporterType,
      reporterId,
      targetType: input.targetType,
      ...(input.targetType === "company" ? { targetCompanyId: input.targetId } : {}),
      ...(input.targetType === "talent" || input.targetType === "profile" ? { targetTalentId: input.targetId } : {}),
      ...(input.targetType === "message" ? { targetMessageId: input.targetId } : {}),
      category: input.category,
      description: input.description,
      status: "open",
    },
  });

  await inngest.send({
    name: "moderation/report-submitted",
    data: { reportId: report.id, targetType: input.targetType, targetId: input.targetId, category: input.category },
  });

  return report;
}

export async function listReports(opts: {
  status?: "open" | "under_review" | "resolved" | "dismissed";
  cursor?: string;
  limit?: number;
}) {
  const limit = opts.limit ?? 50;
  const where: Prisma.ReportWhereInput = opts.status ? { status: opts.status } : {};

  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    const [ts] = decoded.split("__");
    where.createdAt = { lt: new Date(ts) };
  }

  const items = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(`${last.createdAt.toISOString()}__${last.id}`) : null;

  return { items: sliced, hasMore, nextCursor };
}

export async function getReport(id: string): Promise<Report> {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw new AppError("NOT_FOUND", "Report not found", 404);
  return report;
}

export async function decideReport(
  reportId: string,
  input: DecideModerationInput,
  auditCtx: AuditContext,
): Promise<{ report: Report; action: ModerationAction | null }> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("NOT_FOUND", "Report not found", 404);
  if (report.status === "resolved" || report.status === "dismissed") {
    throw new AppError("CONFLICT", "Report is already decided", 409);
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: input.decision,
      decidedBy: auditCtx.actorId,
      decidedAt: new Date(),
      decision: input.reason,
    },
  });

  let modAction: ModerationAction | null = null;

  if (input.action && input.action !== "unflag") {
    modAction = await prisma.moderationAction.create({
      data: {
        id: generateId(),
        targetType: report.targetType,
        targetId: report.targetCompanyId ?? report.targetTalentId ?? report.targetMessageId ?? reportId,
        action: input.action,
        reason: input.reason,
        durationDays: input.durationDays,
        performedBy: auditCtx.actorId,
        reportId,
      },
    });

    // Apply the action to the target entity
    await applyModerationAction(report, input);
  }

  await writeAudit(auditCtx, `moderation.report.${input.decision}`, "report", reportId, {
    action: input.action,
    reason: input.reason,
  });

  await prisma.adminActivity.create({
    data: {
      id: generateId(),
      adminId: auditCtx.actorId,
      action: `moderation.report.${input.decision}`,
      payload: { reportId, action: input.action, reason: input.reason },
    },
  });

  return { report: updatedReport, action: modAction };
}

async function applyModerationAction(
  report: Report,
  input: DecideModerationInput,
): Promise<void> {
  const { action, reason, durationDays } = input;

  if (report.targetCompanyId && action) {
    if (action === "ban") {
      await prisma.company.update({
        where: { id: report.targetCompanyId },
        data: { status: "banned", suspendedAt: new Date(), suspendedReason: reason },
      });
    } else if (action === "suspend") {
      await prisma.company.update({
        where: { id: report.targetCompanyId },
        data: { status: "suspended", suspendedAt: new Date(), suspendedReason: reason },
      });
    }
  }

  if (report.targetTalentId && action) {
    if (action === "ban") {
      await prisma.talent.update({
        where: { id: report.targetTalentId },
        data: { status: "banned", suspendedAt: new Date(), suspendedReason: reason },
      });
    } else if (action === "suspend") {
      await prisma.talent.update({
        where: { id: report.targetTalentId },
        data: { status: "suspended", suspendedAt: new Date(), suspendedReason: reason },
      });
    }
  }

  if (report.targetMessageId && action === "ban") {
    await prisma.message.update({
      where: { id: report.targetMessageId },
      data: { moderationStatus: "blocked" },
    });
  }
}
