import { z } from "zod";

export const contractStatusSchema = z.enum([
  "pending_signature",
  "active",
  "in_dispute",
  "completed",
  "cancelled",
]);

export const milestoneStatusSchema = z.enum([
  "pending",
  "funded",
  "submitted",
  "approved",
  "released",
  "disputed",
]);

export const createContractSchema = z.object({
  proposalId: z.string().uuid(),
  termsMarkdown: z.string().min(20).max(50000),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  engagementType: z.enum(["fixed", "hourly"]),
});

export const addMilestoneSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  amount: z.number().int().positive(),
});

export const updateMilestoneSchema = addMilestoneSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type AddMilestoneInput = z.infer<typeof addMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
