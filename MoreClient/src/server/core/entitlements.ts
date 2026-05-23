import { prisma } from "./db";
import { AppError } from "./errors";
import type { PrincipalType } from "@prisma/client";

// ─── Plan Limits ──────────────────────────────────────────────────────────────

interface PlanLimits {
  proposalsPerMonth: number;
  jobsPerDay: number;
  aiMatchRequestsPerDay: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    proposalsPerMonth: 10,
    jobsPerDay: 50,
    aiMatchRequestsPerDay: 0,
  },
  starter: {
    proposalsPerMonth: 50,
    jobsPerDay: 200,
    aiMatchRequestsPerDay: 10,
  },
  growth: {
    proposalsPerMonth: 200,
    jobsPerDay: 1000,
    aiMatchRequestsPerDay: 50,
  },
  enterprise: {
    proposalsPerMonth: Infinity,
    jobsPerDay: Infinity,
    aiMatchRequestsPerDay: Infinity,
  },
};

function getPlanLimits(planCode: string): PlanLimits {
  return PLAN_LIMITS[planCode] ?? PLAN_LIMITS.free;
}

// ─── Usage Counter Helpers ────────────────────────────────────────────────────

/** Get today's date as a YYYY-MM-DD string (used as periodStart). */
function todayDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Get the first day of the current UTC month. */
function monthStartDate(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function getOrCreateCounter(
  principalType: PrincipalType,
  principalId: string,
  periodStart: Date,
) {
  return prisma.usageCounter.upsert({
    where: { principalType_principalId_periodStart: { principalType, principalId, periodStart } },
    create: { principalType, principalId, periodStart },
    update: {},
  });
}

// ─── Entitlement Checks ───────────────────────────────────────────────────────

/**
 * Check that a talent can submit another proposal this month.
 * Throws QUOTA_EXCEEDED if over limit.
 */
export async function checkProposalEntitlement(
  talentId: string,
  planCode: string,
): Promise<void> {
  const limits = getPlanLimits(planCode);
  if (limits.proposalsPerMonth === Infinity) return;

  const periodStart = monthStartDate();
  const counter = await getOrCreateCounter("talent", talentId, periodStart);

  if (counter.proposalsSubmitted >= limits.proposalsPerMonth) {
    throw new AppError(
      "QUOTA_EXCEEDED",
      `You have reached your monthly proposal limit (${limits.proposalsPerMonth}). Upgrade your plan to submit more.`,
      429,
      { limit: limits.proposalsPerMonth, used: counter.proposalsSubmitted },
    );
  }
}

/**
 * Check that a company can post another job today.
 * Throws QUOTA_EXCEEDED if over limit.
 */
export async function checkJobPostEntitlement(
  companyId: string,
  planCode: string,
): Promise<void> {
  const limits = getPlanLimits(planCode);
  if (limits.jobsPerDay === Infinity) return;

  const periodStart = todayDate();
  const counter = await getOrCreateCounter("company", companyId, periodStart);

  if (counter.jobsPosted >= limits.jobsPerDay) {
    throw new AppError(
      "QUOTA_EXCEEDED",
      `You have reached your daily job posting limit (${limits.jobsPerDay}).`,
      429,
      { limit: limits.jobsPerDay, used: counter.jobsPosted },
    );
  }
}

/**
 * Increment the proposal counter for a talent (call after successful submit).
 */
export async function incrementProposalCounter(talentId: string): Promise<void> {
  const periodStart = monthStartDate();
  await prisma.usageCounter.upsert({
    where: { principalType_principalId_periodStart: { principalType: "talent", principalId: talentId, periodStart } },
    create: { principalType: "talent", principalId: talentId, periodStart, proposalsSubmitted: 1 },
    update: { proposalsSubmitted: { increment: 1 } },
  });
}

/**
 * Increment the job post counter for a company (call after successful publish).
 */
export async function incrementJobPostCounter(companyId: string): Promise<void> {
  const periodStart = todayDate();
  await prisma.usageCounter.upsert({
    where: { principalType_principalId_periodStart: { principalType: "company", principalId: companyId, periodStart } },
    create: { principalType: "company", principalId: companyId, periodStart, jobsPosted: 1 },
    update: { jobsPosted: { increment: 1 } },
  });
}
