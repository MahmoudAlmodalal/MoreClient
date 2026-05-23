import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import type { PlatformDailyMetrics } from "@prisma/client";

export async function rollupDailyMetrics(day: Date): Promise<PlatformDailyMetrics> {
  const dayStart = new Date(day);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [
    signupsTalent,
    signupsCompany,
    jobsPublished,
    proposalsSubmitted,
    contractsSigned,
    activeTalent,
    activeCompanies,
  ] = await Promise.all([
    prisma.talent.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.company.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.job.count({ where: { publishedAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.proposal.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.contract.count({ where: { status: "active", startedAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.talent.count({ where: { status: "active", deletedAt: null } }),
    prisma.company.count({ where: { status: "active", deletedAt: null } }),
  ]);

  // GMV: sum of released milestone amounts in the day
  const releasedMilestones = await prisma.milestone.aggregate({
    _sum: { amount: true },
    where: { status: "released", releasedAt: { gte: dayStart, lt: dayEnd } },
  });

  const gmvCents = BigInt(releasedMilestones._sum.amount ?? 0);
  const commissionCents = BigInt(Math.round(Number(gmvCents) * 0.1)); // 10%

  const metrics = await prisma.platformDailyMetrics.upsert({
    where: { day: dayStart },
    create: {
      day: dayStart,
      signupsTalent,
      signupsCompany,
      jobsPublished,
      proposalsSubmitted,
      contractsSigned,
      gmvCents,
      commissionCents,
      aiCostCents: 0,
      activeTalent,
      activeCompanies,
    },
    update: {
      signupsTalent,
      signupsCompany,
      jobsPublished,
      proposalsSubmitted,
      contractsSigned,
      gmvCents,
      commissionCents,
      activeTalent,
      activeCompanies,
    },
  });

  logger.info({ day: dayStart.toISOString().split("T")[0], gmvCents: gmvCents.toString() }, "daily metrics rollup complete");
  return metrics;
}

export async function getPlatformMetrics(opts: { days?: number } = {}): Promise<PlatformDailyMetrics[]> {
  const days = opts.days ?? 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  return prisma.platformDailyMetrics.findMany({
    where: { day: { gte: since } },
    orderBy: { day: "asc" },
  });
}
