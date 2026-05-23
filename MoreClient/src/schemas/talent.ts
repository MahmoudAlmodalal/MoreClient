import { z } from "zod";

export const talentStatusSchema = z.enum(["active", "suspended", "banned", "paused"]);
export const availabilityStatusSchema = z.enum(["available", "limited", "unavailable"]);
export const searchVisibilitySchema = z.enum(["public", "hidden"]);
export const skillLevelSchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);
export const proficiencySchema = z.enum(["basic", "conversational", "fluent", "native"]);

export const updateTalentProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  country: z.string().length(2).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  hourlyRate: z.number().int().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  availability: availabilityStatusSchema.optional(),
  yearsExperience: z.number().int().min(0).max(50).optional().nullable(),
  searchVisibility: searchVisibilitySchema.optional(),
});

export const portfolioItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(10).default([]),
  url: z.string().url().optional(),
});

export const experienceItemSchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const talentSkillSchema = z.object({
  skillId: z.string().uuid(),
  level: skillLevelSchema.default("intermediate"),
  yearsExp: z.number().int().min(0).optional().nullable(),
});

export const talentLanguageSchema = z.object({
  locale: z.string().min(2).max(5),
  proficiency: proficiencySchema,
});

export type UpdateTalentProfileInput = z.infer<typeof updateTalentProfileSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type ExperienceItemInput = z.infer<typeof experienceItemSchema>;
export type TalentSkillInput = z.infer<typeof talentSkillSchema>;
export type TalentLanguageInput = z.infer<typeof talentLanguageSchema>;
