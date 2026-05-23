import { requireCohere, COHERE_RERANK_MODEL } from "@/server/core/ai/cohere";
import { getPineconeIndex, PINECONE_NAMESPACES as PN } from "@/server/core/ai/pinecone";
import { embedQuery } from "./embedding";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { z } from "zod";

const csvOrArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v) ? v : v.split(",");
    return arr.map((s) => s.trim()).filter(Boolean);
  });

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(500),
  type: z.enum(["talent", "jobs"]).default("talent"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  country: z.string().length(2).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  // Talent filters
  skillIds: csvOrArray.pipe(z.array(z.string().uuid()).max(20).optional()),
  hourlyRateMin: z.coerce.number().int().nonnegative().optional(),
  hourlyRateMax: z.coerce.number().int().positive().optional(),
  availability: z.enum(["available", "limited", "unavailable"]).optional(),
  languages: csvOrArray,
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  featuredOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (typeof v === "string" ? v === "true" : v)),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchResult {
  id: string;
  type: "talent" | "job";
  score: number;
  metadata: Record<string, unknown>;
}

export async function semanticSearch(query: SearchQuery): Promise<SearchResult[]> {
  const { q, type, limit, country } = query;

  const queryVector = await embedQuery(q);
  const index = getPineconeIndex();
  const ns = index.namespace(type === "talent" ? PN.talent : PN.jobs);

  const filter: Record<string, unknown> = {};
  if (country) filter.country = country;

  if (type === "talent") {
    if (query.skillIds?.length) filter.skills = { $in: query.skillIds };
    if (query.languages?.length) filter.languages = { $in: query.languages };
    if (query.availability) filter.availability = query.availability;
    if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
    if (query.hourlyRateMin != null || query.hourlyRateMax != null) {
      filter.hourlyRate = {
        ...(query.hourlyRateMin != null ? { $gte: query.hourlyRateMin } : {}),
        ...(query.hourlyRateMax != null ? { $lte: query.hourlyRateMax } : {}),
      };
    }
  }

  const queryResult = await ns.query({
    vector: queryVector,
    topK: Math.min(limit * 3, 100),
    includeMetadata: true,
    filter: Object.keys(filter).length ? filter : undefined,
  });

  if (!queryResult.matches?.length) return [];

  const ids = queryResult.matches.map((m) => m.id);

  const cohere = requireCohere();
  const reranked = await cohere.rerank({
    model: COHERE_RERANK_MODEL,
    query: q,
    documents: ids,
    topN: limit,
    returnDocuments: false,
  });

  // Fetch display metadata from DB
  const resultIds = reranked.results.map((r) => ids[r.index]);

  let metadataMap = new Map<string, Record<string, unknown>>();
  if (type === "talent") {
    // Re-apply filters against live data — this both narrows results that slipped
    // through stale Pinecone metadata and supports profiles embedded before the
    // metadata fields existed.
    const talentWhere: import("@prisma/client").Prisma.TalentWhereInput = {
      id: { in: resultIds },
      status: "active",
      deletedAt: null,
      searchVisibility: "public",
    };
    if (country) talentWhere.country = country;
    if (query.availability) talentWhere.availability = query.availability;
    if (query.verificationStatus) talentWhere.verificationStatus = query.verificationStatus;
    if (query.skillIds?.length) talentWhere.skills = { some: { skillId: { in: query.skillIds } } };
    if (query.languages?.length) talentWhere.languages = { some: { locale: { in: query.languages } } };
    if (query.hourlyRateMin != null || query.hourlyRateMax != null) {
      talentWhere.hourlyRate = {
        ...(query.hourlyRateMin != null ? { gte: query.hourlyRateMin } : {}),
        ...(query.hourlyRateMax != null ? { lte: query.hourlyRateMax } : {}),
      };
    }
    if (query.featuredOnly) talentWhere.featuredUntil = { gt: new Date() };

    const talents = await prisma.talent.findMany({
      where: talentWhere,
      select: {
        id: true,
        handle: true,
        displayName: true,
        headline: true,
        avatarUrl: true,
        country: true,
        hourlyRate: true,
        featuredUntil: true,
      },
    });
    metadataMap = new Map(talents.map((t) => [t.id, t as unknown as Record<string, unknown>]));
  } else {
    const jobs = await prisma.job.findMany({
      where: { id: { in: resultIds }, status: "published", deletedAt: null },
      select: { id: true, title: true, companyId: true, budgetMin: true, budgetMax: true, country: true, engagementType: true },
    });
    metadataMap = new Map(jobs.map((j) => [j.id, j as unknown as Record<string, unknown>]));
  }

  const results: SearchResult[] = reranked.results
    .map((r) => {
      const id = ids[r.index];
      const meta = metadataMap.get(id);
      if (!meta) return null;
      return {
        id,
        type: type as "talent" | "job",
        score: Math.round(r.relevanceScore * 100) / 100,
        metadata: meta,
      };
    })
    .filter((r): r is SearchResult => r !== null);

  // Featured-first: active featured talent surfaces before non-featured results.
  if (type === "talent") {
    const now = Date.now();
    results.sort((a, b) => {
      const af = (a.metadata.featuredUntil as Date | string | null);
      const bf = (b.metadata.featuredUntil as Date | string | null);
      const aFeatured = af && new Date(af as string).getTime() > now ? 1 : 0;
      const bFeatured = bf && new Date(bf as string).getTime() > now ? 1 : 0;
      return bFeatured - aFeatured || b.score - a.score;
    });
  }

  logger.info({ query: q, type, resultCount: results.length }, "semantic search complete");
  return results;
}
