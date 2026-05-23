"use server";

import { requirePrincipal } from "../core/auth";
import { TalentService } from "./service";
import { toAppError } from "../core/errors";
import {
  updateTalentProfileSchema,
  portfolioItemSchema,
  experienceItemSchema,
  talentSkillSchema,
  talentLanguageSchema,
} from "@/schemas/talent";
import { writeAudit, auditContextFromPrincipal } from "../audit";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateTalentProfileAction(
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    const input = updateTalentProfileSchema.parse(rawInput);
    await TalentService.updateProfile(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "talent.update", "Talent", ctx.talent.id);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function addPortfolioItemAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    const input = portfolioItemSchema.parse(rawInput);
    await TalentService.addPortfolioItem(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "talent.portfolio.add", "PortfolioItem", undefined, { title: input.title });
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function removePortfolioItemAction(itemId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    await TalentService.removePortfolioItem(ctx, itemId);
    await writeAudit(auditContextFromPrincipal(ctx), "talent.portfolio.remove", "PortfolioItem", itemId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function addExperienceAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    const input = experienceItemSchema.parse(rawInput);
    await TalentService.addExperienceItem(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "talent.experience.add", "ExperienceItem");
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function upsertSkillAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    const input = talentSkillSchema.parse(rawInput);
    await TalentService.upsertSkill(ctx, input);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function upsertLanguageAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") return { success: false, error: "Talent account required" };
    const input = talentLanguageSchema.parse(rawInput);
    await TalentService.upsertLanguage(ctx, input);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}
