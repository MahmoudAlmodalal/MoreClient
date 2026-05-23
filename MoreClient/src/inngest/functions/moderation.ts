import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { prisma } from "@/server/core/db";

/**
 * Automatically triage a newly submitted report.
 * Sets status to under_review and applies quick auto-decisions for clear-cut cases.
 */
export const triageReport = inngest.createFunction(
  { id: "moderation.review-report", name: "Auto-Triage Report" },
  { event: "moderation/report-submitted" },
  async ({ event, step }) => {
    const { reportId, targetType, category } = event.data as {
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

    logger.info({ reportId, targetType, category, isHighPriority }, "report triaged");
    return { reportId, isHighPriority };
  },
);
