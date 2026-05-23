import { z } from "zod";

export const engagementTypeSchema = z.enum(["fixed", "hourly"]);
export const jobStatusSchema = z.enum(["draft", "published", "paused", "closed", "cancelled"]);

export const createJobSchema = z
  .object({
    title: z.string().min(5).max(200),
    description: z.string().min(20).max(10000),
    locale: z.enum(["en", "ar"]).default("en"),
    engagementType: engagementTypeSchema,
    budgetMin: z.number().int().positive().optional(),
    budgetMax: z.number().int().positive().optional(),
    currency: z.string().length(3).default("USD"),
    durationWeeks: z.number().int().positive().optional(),
    remote: z.boolean().default(true),
    country: z.string().length(2).optional(),
    skillIds: z.array(z.string().uuid()).max(20).default([]),
  })
  .refine(
    (d) => !d.budgetMin || !d.budgetMax || d.budgetMin <= d.budgetMax,
    { message: "budgetMin must be ≤ budgetMax", path: ["budgetMin"] },
  );

export const updateJobSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(20).max(10000).optional(),
    locale: z.enum(["en", "ar"]).optional(),
    engagementType: engagementTypeSchema.optional(),
    budgetMin: z.number().int().positive().optional().nullable(),
    budgetMax: z.number().int().positive().optional().nullable(),
    currency: z.string().length(3).optional(),
    durationWeeks: z.number().int().positive().optional().nullable(),
    remote: z.boolean().optional(),
    country: z.string().length(2).optional().nullable(),
    skillIds: z.array(z.string().uuid()).max(20).optional(),
  })
  .refine(
    (d) => !d.budgetMin || !d.budgetMax || d.budgetMin <= d.budgetMax,
    { message: "budgetMin must be ≤ budgetMax", path: ["budgetMin"] },
  );

// Accept skillIds as a repeated query param or a comma-separated string.
const skillIdsQuery = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v) ? v : v.split(",");
    return arr.map((s) => s.trim()).filter(Boolean);
  })
  .pipe(z.array(z.string().uuid()).max(20).optional());

export const listJobsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: jobStatusSchema.optional(),
  country: z.string().length(2).optional(),
  engagementType: engagementTypeSchema.optional(),
  budgetMin: z.coerce.number().int().positive().optional(),
  budgetMax: z.coerce.number().int().positive().optional(),
  skillId: z.string().uuid().optional(),
  skillIds: skillIdsQuery,
  remote: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (typeof v === "string" ? v === "true" : v)),
  durationMin: z.coerce.number().int().positive().optional(),
  durationMax: z.coerce.number().int().positive().optional(),
  q: z.string().max(200).optional(),
  companyId: z.string().uuid().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
