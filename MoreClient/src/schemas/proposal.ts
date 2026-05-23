import { z } from "zod";

export const proposalStatusSchema = z.enum([
  "submitted",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const submitProposalSchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().min(50).max(5000),
  bidAmount: z.number().int().positive(),
  bidCurrency: z.string().length(3).default("USD"),
  durationWeeks: z.number().int().positive().optional(),
  attachments: z.array(z.string().url()).max(5).default([]),
});

export const listProposalsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: proposalStatusSchema.optional(),
  jobId: z.string().uuid().optional(),
  talentId: z.string().uuid().optional(),
});

export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;
