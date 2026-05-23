import { z } from "zod";

export const companyRoleSchema = z.enum(["owner", "admin", "recruiter", "viewer"]);
export const companyStatusSchema = z.enum(["active", "suspended", "banned", "closed"]);
export const verificationStatusSchema = z.enum(["unverified", "pending", "verified", "rejected"]);

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  country: z.string().length(2),
  locale: z.enum(["en", "ar"]).default("en"),
  legalName: z.string().max(200).optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  legalName: z.string().max(200).optional(),
  country: z.string().length(2).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  websiteUrl: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: companyRoleSchema.exclude(["owner"]),
});

export const updateMemberRoleSchema = z.object({
  role: companyRoleSchema.exclude(["owner"]),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CompanyRole = z.infer<typeof companyRoleSchema>;
export type CompanyStatus = z.infer<typeof companyStatusSchema>;
