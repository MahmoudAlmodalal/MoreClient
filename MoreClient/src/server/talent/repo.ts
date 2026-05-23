import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import type {
  Talent,
  TalentSkill,
  PortfolioItem,
  ExperienceItem,
  TalentLanguage,
  Prisma,
} from "@prisma/client";
import type {
  UpdateTalentProfileInput,
  PortfolioItemInput,
  ExperienceItemInput,
  TalentSkillInput,
  TalentLanguageInput,
} from "@/schemas/talent";

export class TalentRepo {
  static async findByClerkUser(clerkUserId: string): Promise<Talent | null> {
    return prisma.talent.findUnique({ where: { clerkUserId, deletedAt: null } });
  }

  static async findById(id: string): Promise<Talent | null> {
    return prisma.talent.findUnique({ where: { id, deletedAt: null } });
  }

  static async findByHandle(handle: string): Promise<Talent | null> {
    return prisma.talent.findFirst({
      where: { handle, deletedAt: null },
    });
  }

  static async create(data: {
    clerkUserId: string;
    handle: string;
    displayName: string;
    country: string;
    locale?: string;
  }): Promise<Talent> {
    return prisma.talent.create({
      data: {
        id: generateId(),
        clerkUserId: data.clerkUserId,
        handle: data.handle,
        displayName: data.displayName,
        country: data.country,
        locale: data.locale ?? "en",
      },
    });
  }

  static async update(id: string, data: UpdateTalentProfileInput): Promise<Talent> {
    return prisma.talent.update({ where: { id }, data });
  }

  static async softDelete(id: string): Promise<void> {
    await prisma.talent.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Portfolio ────────────────────────────────────────────────────────────

  static async getPortfolio(talentId: string): Promise<PortfolioItem[]> {
    return prisma.portfolioItem.findMany({ where: { talentId } });
  }

  static async addPortfolioItem(
    talentId: string,
    input: PortfolioItemInput,
  ): Promise<PortfolioItem> {
    return prisma.portfolioItem.create({
      data: { id: generateId(), talentId, ...input },
    });
  }

  static async removePortfolioItem(id: string, talentId: string): Promise<void> {
    await prisma.portfolioItem.deleteMany({ where: { id, talentId } });
  }

  // ─── Experience ───────────────────────────────────────────────────────────

  static async getExperience(talentId: string): Promise<ExperienceItem[]> {
    return prisma.experienceItem.findMany({
      where: { talentId },
      orderBy: { startDate: "desc" },
    });
  }

  static async addExperienceItem(
    talentId: string,
    input: ExperienceItemInput,
  ): Promise<ExperienceItem> {
    return prisma.experienceItem.create({
      data: {
        id: generateId(),
        talentId,
        company: input.company,
        title: input.title,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        description: input.description,
      },
    });
  }

  static async removeExperienceItem(id: string, talentId: string): Promise<void> {
    await prisma.experienceItem.deleteMany({ where: { id, talentId } });
  }

  // ─── Skills ──────────────────────────────────────────────────────────────

  static async getSkills(talentId: string): Promise<TalentSkill[]> {
    return prisma.talentSkill.findMany({ where: { talentId } });
  }

  static async upsertSkill(
    talentId: string,
    input: TalentSkillInput,
  ): Promise<TalentSkill> {
    return prisma.talentSkill.upsert({
      where: { talentId_skillId: { talentId, skillId: input.skillId } },
      create: { talentId, skillId: input.skillId, level: input.level, yearsExp: input.yearsExp },
      update: { level: input.level, yearsExp: input.yearsExp },
    });
  }

  static async removeSkill(talentId: string, skillId: string): Promise<void> {
    await prisma.talentSkill.deleteMany({ where: { talentId, skillId } });
  }

  // ─── Languages ───────────────────────────────────────────────────────────

  static async getLanguages(talentId: string): Promise<TalentLanguage[]> {
    return prisma.talentLanguage.findMany({ where: { talentId } });
  }

  static async upsertLanguage(
    talentId: string,
    input: TalentLanguageInput,
  ): Promise<TalentLanguage> {
    return prisma.talentLanguage.upsert({
      where: { talentId_locale: { talentId, locale: input.locale } },
      create: { talentId, locale: input.locale, proficiency: input.proficiency },
      update: { proficiency: input.proficiency },
    });
  }

  static async removeLanguage(talentId: string, locale: string): Promise<void> {
    await prisma.talentLanguage.deleteMany({ where: { talentId, locale } });
  }
}
