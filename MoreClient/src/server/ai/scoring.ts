import { requireOpenAI } from "@/server/core/ai/openai";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { loadPrompt, interpolate } from "./prompts/index";
import { wrapUserContent, parseAiJsonOutput } from "./guards";
import { z } from "zod";

interface ScoringResult {
  score: number;
  reasons: {
    relevance: string;
    experience: string;
    coverLetter: string;
    budget: string;
    availability: string;
  };
  summary: string;
  recommendation: "strong_yes" | "yes" | "maybe" | "no";
}

export async function scoreProposal(proposalId: string): Promise<ScoringResult | null> {
  const openai = requireOpenAI();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      job: {
        include: { requiredSkills: { include: { skill: true } } },
      },
      talent: {
        include: {
          skills: { include: { skill: true } },
          experience: true,
        },
      },
    },
  });

  if (!proposal) {
    logger.warn({ proposalId }, "proposal not found for scoring");
    return null;
  }

  const { content, version } = loadPrompt("proposal-score");

  const systemPrompt = interpolate(content, {
    jobJson: JSON.stringify(
      {
        title: proposal.job.title,
        description: proposal.job.description,
        engagementType: proposal.job.engagementType,
        budgetMin: proposal.job.budgetMin,
        budgetMax: proposal.job.budgetMax,
        durationWeeks: proposal.job.durationWeeks,
        requiredSkills: proposal.job.requiredSkills.map((s) => s.skill.nameEn),
      },
      null,
      2,
    ),
    talentJson: JSON.stringify(
      {
        displayName: proposal.talent.displayName,
        headline: proposal.talent.headline,
        yearsExperience: proposal.talent.yearsExperience,
        skills: proposal.talent.skills.map((s) => ({ name: s.skill.nameEn, level: s.level })),
        experience: proposal.talent.experience.map((e) => ({
          title: e.title,
          company: e.company,
          description: e.description,
        })),
      },
      null,
      2,
    ),
    // Wrap the cover letter (user-generated content) in role boundaries
    proposalJson: wrapUserContent(
      JSON.stringify(
        {
          coverLetter: proposal.coverLetter,
          bidAmount: proposal.bidAmount,
          bidCurrency: proposal.bidCurrency,
          durationWeeks: proposal.durationWeeks,
        },
        null,
        2,
      ),
      "job",
    ),
  });

  logger.info({ proposalId, promptVersion: version }, "scoring proposal");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Score this proposal." },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 800,
  });

  const raw = response.choices[0]?.message.content;
  if (!raw) return null;

  const scoringSchema = z.object({
    score: z.number().min(0).max(100),
    reasons: z.object({
      relevance: z.string().max(500),
      experience: z.string().max(500),
      coverLetter: z.string().max(500),
      budget: z.string().max(500),
      availability: z.string().max(500),
    }),
    summary: z.string().max(1000),
    recommendation: z.enum(["strong_yes", "yes", "maybe", "no"]),
  });

  let result: ScoringResult;
  try {
    result = parseAiJsonOutput(raw, scoringSchema);
  } catch {
    logger.error({ proposalId }, "scoring response failed schema validation — discarding");
    return null;
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      aiScore: result.score,
      aiReasons: result as unknown as Record<string, unknown>,
    },
  });

  logger.info({ proposalId, score: result.score, recommendation: result.recommendation }, "proposal scored");
  return result;
}
