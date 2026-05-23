import { createHash } from "crypto";
import { requireCohere, COHERE_EMBED_MODEL } from "@/server/core/ai/cohere";
import { getPineconeIndex, PINECONE_NAMESPACES as PN } from "@/server/core/ai/pinecone";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";

// ─── Text Canonicalisation ─────────────────────────────────────────────────

export async function buildTalentText(talentId: string): Promise<string> {
  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    include: {
      skills: { include: { skill: true } },
      portfolio: true,
      experience: true,
      languages: true,
    },
  });
  if (!talent) throw new Error(`Talent ${talentId} not found`);

  const parts: string[] = [
    `Name: ${talent.displayName}`,
    talent.headline ? `Headline: ${talent.headline}` : "",
    talent.bio ? `Bio: ${talent.bio}` : "",
    `Country: ${talent.country}`,
    `Locale: ${talent.locale}`,
    talent.yearsExperience ? `Years of experience: ${talent.yearsExperience}` : "",
    talent.hourlyRate ? `Hourly rate: $${talent.hourlyRate} USD` : "",
    `Availability: ${talent.availability}`,
  ];

  if (talent.skills.length) {
    parts.push(`Skills: ${talent.skills.map((s) => `${s.skill.nameEn} (${s.level})`).join(", ")}`);
  }

  if (talent.experience.length) {
    const exp = talent.experience
      .map((e) => `${e.title} at ${e.company}${e.description ? `: ${e.description}` : ""}`)
      .join("; ");
    parts.push(`Experience: ${exp}`);
  }

  if (talent.portfolio.length) {
    const port = talent.portfolio.map((p) => `${p.title}${p.description ? `: ${p.description}` : ""}`).join("; ");
    parts.push(`Portfolio: ${port}`);
  }

  if (talent.languages.length) {
    parts.push(`Languages: ${talent.languages.map((l) => `${l.locale} (${l.proficiency})`).join(", ")}`);
  }

  return parts.filter(Boolean).join("\n");
}

export async function buildJobText(jobId: string): Promise<string> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { requiredSkills: { include: { skill: true } } },
  });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const parts: string[] = [
    `Title: ${job.title}`,
    `Description: ${job.description}`,
    `Engagement: ${job.engagementType}`,
    job.country ? `Location: ${job.country}` : "Location: Remote",
    job.budgetMin && job.budgetMax ? `Budget: $${job.budgetMin}–$${job.budgetMax} ${job.currency}` : "",
    job.durationWeeks ? `Duration: ${job.durationWeeks} weeks` : "",
  ];

  if (job.requiredSkills.length) {
    parts.push(`Required skills: ${job.requiredSkills.map((s) => s.skill.nameEn).join(", ")}`);
  }

  return parts.filter(Boolean).join("\n");
}

// ─── Embed + Upsert ────────────────────────────────────────────────────────

function sha256hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function embedAndUpsertTalent(talentId: string): Promise<{ embedded: boolean; hash: string }> {
  const cohere = requireCohere();
  const index = getPineconeIndex();
  const ns = index.namespace(PN.talent);

  const text = await buildTalentText(talentId);
  const hash = sha256hex(text);

  const talent = await prisma.talent.findUnique({ where: { id: talentId }, select: { profileEmbeddingHash: true } });
  if (talent?.profileEmbeddingHash === hash) {
    logger.debug({ talentId }, "talent embedding unchanged, skipping");
    return { embedded: false, hash };
  }

  const response = await cohere.embed({
    texts: [text],
    model: COHERE_EMBED_MODEL,
    inputType: "search_document",
  });

  const embedding = (response.embeddings as number[][])[0];

  await ns.upsert([
    {
      id: talentId,
      values: embedding,
      metadata: {
        type: "talent",
        country: "",
        availability: "",
      },
    },
  ]);

  await prisma.talent.update({
    where: { id: talentId },
    data: { profileEmbeddingId: talentId, profileEmbeddingHash: hash },
  });

  logger.info({ talentId, hash }, "talent profile embedded");
  return { embedded: true, hash };
}

export async function embedAndUpsertJob(jobId: string): Promise<{ embedded: boolean; hash: string }> {
  const cohere = requireCohere();
  const index = getPineconeIndex();
  const ns = index.namespace(PN.jobs);

  const text = await buildJobText(jobId);
  const hash = sha256hex(text);

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { embeddingHash: true } });
  if (job?.embeddingHash === hash) {
    return { embedded: false, hash };
  }

  const response = await cohere.embed({
    texts: [text],
    model: COHERE_EMBED_MODEL,
    inputType: "search_document",
  });

  const embedding = (response.embeddings as number[][])[0];

  await ns.upsert([{ id: jobId, values: embedding, metadata: { type: "job" } }]);

  await prisma.job.update({
    where: { id: jobId },
    data: { embeddingId: jobId, embeddingHash: hash },
  });

  logger.info({ jobId, hash }, "job posting embedded");
  return { embedded: true, hash };
}

/** Embed a raw query string (for search). */
export async function embedQuery(query: string): Promise<number[]> {
  const cohere = requireCohere();
  const response = await cohere.embed({
    texts: [query],
    model: COHERE_EMBED_MODEL,
    inputType: "search_query",
  });
  return (response.embeddings as number[][])[0];
}
