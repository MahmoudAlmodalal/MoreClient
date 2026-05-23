import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { redis } from "@/server/core/redis";
import { writeAudit } from "@/server/audit/index";
import type { FeatureFlag, PlanCatalog } from "@prisma/client";
import type { AuditContext } from "@/server/audit/index";
import { z } from "zod";

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const upsertFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).optional(),
  enabled: z.boolean(),
  rules: z.record(z.unknown()).optional(),
});

export type UpsertFlagInput = z.infer<typeof upsertFlagSchema>;

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function upsertFeatureFlag(
  input: UpsertFlagInput,
  auditCtx: AuditContext,
): Promise<FeatureFlag> {
  const flag = await prisma.featureFlag.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      description: input.description,
      enabled: input.enabled,
      rules: input.rules as object | undefined,
      updatedBy: auditCtx.actorId,
    },
    update: {
      description: input.description,
      enabled: input.enabled,
      rules: input.rules as object | undefined,
      updatedBy: auditCtx.actorId,
    },
  });

  // Bust cache
  if (redis) {
    const pattern = `feature:${input.key}:*`;
    // Upstash doesn't support SCAN; just delete common patterns
    await redis.del(`feature:${input.key}:global`).catch(() => {});
  }

  await writeAudit(auditCtx, "featureFlag.upserted", "feature_flag", input.key, { enabled: input.enabled });
  return flag;
}

export async function deleteFeatureFlag(key: string, auditCtx: AuditContext): Promise<void> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) throw new AppError("NOT_FOUND", "Feature flag not found", 404);

  await prisma.featureFlag.delete({ where: { key } });
  await writeAudit(auditCtx, "featureFlag.deleted", "feature_flag", key);
}

// ─── Plan Catalog ─────────────────────────────────────────────────────────────

export const upsertPlanSchema = z.object({
  code: z.string().min(1).max(50),
  principalType: z.enum(["company", "talent"]),
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  monthlyCents: z.number().int().nonnegative(),
  yearlyCents: z.number().int().nonnegative(),
  features: z.record(z.unknown()),
  active: z.boolean().default(true),
  stripePriceMonthly: z.string().optional(),
  stripePriceYearly: z.string().optional(),
});

export type UpsertPlanInput = z.infer<typeof upsertPlanSchema>;

export async function listPlanCatalog(): Promise<PlanCatalog[]> {
  return prisma.planCatalog.findMany({ orderBy: [{ principalType: "asc" }, { monthlyCents: "asc" }] });
}

export async function upsertPlanCatalog(
  input: UpsertPlanInput,
  auditCtx: AuditContext,
): Promise<PlanCatalog> {
  const plan = await prisma.planCatalog.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      principalType: input.principalType,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      monthlyCents: input.monthlyCents,
      yearlyCents: input.yearlyCents,
      features: input.features as object,
      active: input.active,
      stripePriceMonthly: input.stripePriceMonthly,
      stripePriceYearly: input.stripePriceYearly,
    },
    update: {
      principalType: input.principalType,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      monthlyCents: input.monthlyCents,
      yearlyCents: input.yearlyCents,
      features: input.features as object,
      active: input.active,
      stripePriceMonthly: input.stripePriceMonthly,
      stripePriceYearly: input.stripePriceYearly,
    },
  });
  await writeAudit(auditCtx, "planCatalog.upserted", "plan_catalog", input.code, { active: input.active });
  return plan;
}
