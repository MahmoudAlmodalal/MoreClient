import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { prisma } from "@/server/core/db";
import { getRepeatOffenderRule } from "@/server/core/feature-flags";
import { autoModerateTarget } from "@/server/moderation/index";

/**
 * Automatically triage a newly submitted report.
 * Sets status to under_review, applies quick auto-decisions for clear-cut cases,
 * and auto-suspends repeat offenders per the configurable moderation rule.
 */
export const triageReport = inngest.createFunction(
  { id: "moderation.review-report", name: "Auto-Triage Report" },
  { event: "moderation/report-submitted" },
  async ({ event, step }) => {
    const { reportId, targetType, targetId, category } = event.data as {
      reportId: string;
      targetType: string;
      targetId: string;
      category: string;
    };

    await step.run("set-under-review", async () => {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "under_review" },
      });
    });

    // Auto-escalate fraud or harassment reports
    const isHighPriority = ["fraud", "harassment"].includes(category);

    // Repeat-offender automation: suspend targets reported ≥ threshold times in window.
    let autoSuspended = false;
    if (targetType === "company" || targetType === "talent") {
      autoSuspended = await step.run("repeat-offender-check", async () => {
        const rule = await getRepeatOffenderRule();
        if (!rule) return false;

        const since = new Date(Date.now() - rule.windowDays * 24 * 60 * 60 * 1000);
        const where =
          targetType === "company"
            ? { targetCompanyId: targetId, createdAt: { gte: since } }
            : { targetTalentId: targetId, createdAt: { gte: since } };
        const reportCount = await prisma.report.count({ where });

        if (reportCount >= rule.threshold) {
          await autoModerateTarget(
            targetType,
            targetId,
            rule.action,
            `Automated ${rule.action}: ${reportCount} reports within ${rule.windowDays} days`,
          );
          logger.info({ targetType, targetId, reportCount, threshold: rule.threshold }, "repeat-offender auto-action applied");
          return true;
        }
        return false;
      });
    }

    logger.info({ reportId, targetType, category, isHighPriority, autoSuspended }, "report triaged");
    return { reportId, isHighPriority, autoSuspended };
  },
);
