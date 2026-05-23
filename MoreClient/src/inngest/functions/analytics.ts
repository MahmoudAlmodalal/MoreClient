import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { prisma } from "@/server/core/db";

/** Roll up daily platform metrics into PlatformDailyMetrics. */
export const rollupDailyAnalytics = inngest.createFunction(
  { id: "analytics.rollup-daily", name: "Rollup Daily Analytics" },
  { cron: "0 1 * * *" },
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const dayStr = yesterday.toISOString().split("T")[0];

    const stats = await step.run("aggregate", async () => {
      const [signupsTalent, signupsCompany, jobsPublished, proposalsSubmitted, contractsSigned] =
        await Promise.all([
          prisma.talent.count({ where: { createdAt: { gte: yesterday } } }),
          prisma.company.count({ where: { createdAt: { gte: yesterday } } }),
          prisma.job.count({ where: { publishedAt: { gte: yesterday } } }),
          prisma.proposal.count({ where: { createdAt: { gte: yesterday } } }),
          prisma.contract.count({
            where: {
              status: "active",
              startedAt: { gte: yesterday },
            },
          }),
        ]);

      return { signupsTalent, signupsCompany, jobsPublished, proposalsSubmitted, contractsSigned };
    });

    await step.run("persist", async () => {
      await prisma.platformDailyMetrics.upsert({
        where: { day: yesterday },
        create: {
          day: yesterday,
          signupsTalent: stats.signupsTalent,
          signupsCompany: stats.signupsCompany,
          jobsPublished: stats.jobsPublished,
          proposalsSubmitted: stats.proposalsSubmitted,
          contractsSigned: stats.contractsSigned,
          gmvCents: BigInt(0),
          commissionCents: BigInt(0),
          aiCostCents: 0,
          activeTalent: 0,
          activeCompanies: 0,
        },
        update: {
          signupsTalent: stats.signupsTalent,
          signupsCompany: stats.signupsCompany,
          jobsPublished: stats.jobsPublished,
          proposalsSubmitted: stats.proposalsSubmitted,
          contractsSigned: stats.contractsSigned,
        },
      });
    });

    logger.info({ day: dayStr, ...stats }, "daily analytics rollup complete");
    return { day: dayStr, ...stats };
  },
);
