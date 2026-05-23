import { prisma } from "@/server/core/db";

/**
 * Admin overview of platform subscriptions: a recent list plus per-plan counts.
 * Subscription has no BigInt fields, so the result is JSON-safe as-is.
 */
export async function adminListSubscriptions() {
  const [items, grouped] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.subscription.groupBy({
      by: ["planCode", "status"],
      _count: { _all: true },
    }),
  ]);

  const byPlan = grouped.map((g) => ({
    planCode: g.planCode,
    status: g.status,
    count: g._count._all,
  }));

  return { items, byPlan, total: items.length };
}
