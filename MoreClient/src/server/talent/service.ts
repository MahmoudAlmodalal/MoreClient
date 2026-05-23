import type { Talent, PortfolioItem, ExperienceItem, TalentSkill, TalentLanguage } from "@prisma/client";
import { TalentRepo } from "./repo";
import { AppError } from "../core/errors";
import type { TalentContext } from "../core/auth";
import type {
  UpdateTalentProfileInput,
  PortfolioItemInput,
  ExperienceItemInput,
  TalentSkillInput,
  TalentLanguageInput,
} from "@/schemas/talent";

export class TalentService {
  static async getProfile(ctx: TalentContext): Promise<Talent> {
    const talent = await TalentRepo.findById(ctx.talent.id);
    if (!talent) throw new AppError("NOT_FOUND", "Talent profile not found", 404);
    return talent;
  }

  static async updateProfile(
    ctx: TalentContext,
    input: UpdateTalentProfileInput,
  ): Promise<Talent> {
    return TalentRepo.update(ctx.talent.id, input);
  }

  // ─── Portfolio ──────────────────────────────────────────────────────────

  static async getPortfolio(ctx: TalentContext): Promise<PortfolioItem[]> {
    return TalentRepo.getPortfolio(ctx.talent.id);
  }

  static async addPortfolioItem(
    ctx: TalentContext,
    input: PortfolioItemInput,
  ): Promise<PortfolioItem> {
    const existing = await TalentRepo.getPortfolio(ctx.talent.id);
    if (existing.length >= 20) {
      throw new AppError("QUOTA_EXCEEDED", "Maximum 20 portfolio items allowed", 422);
    }
    return TalentRepo.addPortfolioItem(ctx.talent.id, input);
  }

  static async removePortfolioItem(ctx: TalentContext, itemId: string): Promise<void> {
    await TalentRepo.removePortfolioItem(itemId, ctx.talent.id);
  }

  // ─── Experience ─────────────────────────────────────────────────────────

  static async getExperience(ctx: TalentContext): Promise<ExperienceItem[]> {
    return TalentRepo.getExperience(ctx.talent.id);
  }

  static async addExperienceItem(
    ctx: TalentContext,
    input: ExperienceItemInput,
  ): Promise<ExperienceItem> {
    return TalentRepo.addExperienceItem(ctx.talent.id, input);
  }

  static async removeExperienceItem(ctx: TalentContext, itemId: string): Promise<void> {
    await TalentRepo.removeExperienceItem(itemId, ctx.talent.id);
  }

  // ─── Skills ─────────────────────────────────────────────────────────────

  static async getSkills(ctx: TalentContext): Promise<TalentSkill[]> {
    return TalentRepo.getSkills(ctx.talent.id);
  }

  static async upsertSkill(ctx: TalentContext, input: TalentSkillInput): Promise<TalentSkill> {
    return TalentRepo.upsertSkill(ctx.talent.id, input);
  }

  static async removeSkill(ctx: TalentContext, skillId: string): Promise<void> {
    await TalentRepo.removeSkill(ctx.talent.id, skillId);
  }

  // ─── Languages ──────────────────────────────────────────────────────────

  static async getLanguages(ctx: TalentContext): Promise<TalentLanguage[]> {
    return TalentRepo.getLanguages(ctx.talent.id);
  }

  static async upsertLanguage(ctx: TalentContext, input: TalentLanguageInput): Promise<TalentLanguage> {
    return TalentRepo.upsertLanguage(ctx.talent.id, input);
  }

  static async removeLanguage(ctx: TalentContext, locale: string): Promise<void> {
    await TalentRepo.removeLanguage(ctx.talent.id, locale);
  }
}
