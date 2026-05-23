import { requireOpenAI } from "@/server/core/ai/openai";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { loadPrompt, interpolate } from "./prompts/index";
import { wrapUserContent, parseAiJsonOutput } from "./guards";
import { inngest } from "@/inngest/client";
import { z } from "zod";

interface EnrichmentResult {
  headline?: string;
  bio?: string;
  topSkills?: string[];
  yearsExperience?: number;
  suggestedHourlyRate?: number;
  enrichmentNotes?: string;
}

export async function enrichTalentProfile(talentId: string): Promise<EnrichmentResult | null> {
  const openai = requireOpenAI();

  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    include: {
      skills: { include: { skill: true } },
      portfolio: true,
      experience: true,
      languages: true,
    },
  });

  if (!talent) {
    logger.warn({ talentId }, "talent not found for enrichment");
    return null;
  }

  const profileJson = JSON.stringify(
    {
      displayName: talent.displayName,
      headline: talent.headline,
      bio: talent.bio,
      country: talent.country,
      locale: talent.locale,
      hourlyRate: talent.hourlyRate,
      yearsExperience: talent.yearsExperience,
      availability: talent.availability,
      skills: talent.skills.map((s) => ({ slug: s.skill.slug, nameEn: s.skill.nameEn, level: s.level, yearsExp: s.yearsExp })),
      portfolio: talent.portfolio.map((p) => ({ title: p.title, description: p.description })),
      experience: talent.experience.map((e) => ({
        title: e.title,
        company: e.company,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
      })),
      languages: talent.languages.map((l) => ({ locale: l.locale, proficiency: l.proficiency })),
    },
    null,
    2,
  );

  const { content, version } = loadPrompt("talent-enrich");
  // Layer 1: wrap profile JSON in role boundary markers to prevent injection
  const wrappedProfileJson = wrapUserContent(profileJson, "profile");
  const systemPrompt = interpolate(content, { profileJson: wrappedProfileJson });

  logger.info({ talentId, promptVersion: version }, "running talent enrichment");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Extract and structure the talent profile information as JSON." },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message.content;
  if (!raw) return null;

  // Layer 3: schema-validated AI output prevents prompt-injected JSON from being applied
  const enrichmentSchema = z.object({
    headline: z.string().max(200).optional(),
    bio: z.string().max(2000).optional(),
    topSkills: z.array(z.string()).max(20).optional(),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    suggestedHourlyRate: z.number().int().min(0).max(10000).optional(),
    enrichmentNotes: z.string().max(500).optional(),
  });

  let result: EnrichmentResult;
  try {
    result = parseAiJsonOutput(raw, enrichmentSchema);
  } catch {
    logger.error({ talentId }, "enrichment response failed schema validation — discarding");
    return null;
  }

  // Apply non-destructive merge: only fill missing fields
  const updateData: Record<string, unknown> = {};
  if (!talent.headline && result.headline) updateData.headline = result.headline;
  if (!talent.bio && result.bio) updateData.bio = result.bio;
  if (!talent.yearsExperience && result.yearsExperience) updateData.yearsExperience = result.yearsExperience;
  if (!talent.hourlyRate && result.suggestedHourlyRate) updateData.hourlyRate = result.suggestedHourlyRate;

  if (Object.keys(updateData).length > 0) {
    await prisma.talent.update({ where: { id: talentId }, data: updateData });
    logger.info({ talentId, updateData }, "talent profile enriched");
  }

  // Signal that the profile is ready to be re-embedded
  await inngest.send({ name: "talent/profile-updated", data: { talentId } });

  return result;
}
