import { prisma } from "@/server/core/db";
import { redis } from "@/server/core/redis";
import type { PlanCatalog, FeatureFlag } from "@prisma/client";

const FLAG_CACHE_TTL = 60; // 60 seconds

/** Check if a feature flag is enabled globally or for a specific principal. */
export async function isFeatureEnabled(
  key: string,
  principalId?: string,
): Promise<boolean> {
  const cacheKey = `feature:${key}:${principalId ?? "global"}`;

  if (redis) {
    const cached = await redis.get<boolean>(cacheKey);
    if (cached !== null) return cached;
  }

  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) return false;

  let enabled = flag.enabled;

  // Check per-principal rules if present
  if (flag.rules && principalId) {
    const rules = flag.rules as { whitelist?: string[]; blacklist?: string[] };
    if (rules.blacklist?.includes(principalId)) enabled = false;
    if (rules.whitelist?.includes(principalId)) enabled = true;
  }

  if (redis) {
    await redis.set(cacheKey, enabled, { ex: FLAG_CACHE_TTL });
  }

  return enabled;
}

export async function getPlanEntitlements(planCode: string): Promise<PlanCatalog | null> {
  return prisma.planCatalog.findUnique({ where: { code: planCode } });
}

export async function listPlans(principalType?: "company" | "talent"): Promise<PlanCatalog[]> {
  return prisma.planCatalog.findMany({
    where: {
      active: true,
      ...(principalType ? { principalType } : {}),
    },
    orderBy: { monthlyCents: "asc" },
  });
}

export async function syncSubscription(data: {
  stripeSubId: string;
  customerId: string;
  planCode: string;
  principalType?: string;
  principalId?: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const {
    stripeSubId, planCode, principalType, principalId,
    status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
  } = data;

  if (!principalType || !principalId) return;

  const pType = principalType as "company" | "talent";

  await prisma.subscription.upsert({
    where: { stripeSubId },
    create: {
      principalType: pType,
      principalId,
      stripeSubId,
      planCode,
      status,
      currentPeriodStart: new Date(currentPeriodStart),
      currentPeriodEnd: new Date(currentPeriodEnd),
      cancelAtPeriodEnd,
    },
    update: {
      planCode,
      status,
      currentPeriodStart: new Date(currentPeriodStart),
      currentPeriodEnd: new Date(currentPeriodEnd),
      cancelAtPeriodEnd,
    },
  });

  // Update the principal's planCode
  const effectivePlan = status === "active" ? planCode : "free";
  if (pType === "company") {
    await prisma.company.update({ where: { id: principalId }, data: { planCode: effectivePlan } });
  } else {
    await prisma.talent.update({ where: { id: principalId }, data: { planCode: effectivePlan } });
  }
}
