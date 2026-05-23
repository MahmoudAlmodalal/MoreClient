import { requireCohere, COHERE_RERANK_MODEL } from "@/server/core/ai/cohere";
import { getPineconeIndex, PINECONE_NAMESPACES as PN } from "@/server/core/ai/pinecone";
import { embedQuery, buildJobText } from "./embedding";
import { prisma } from "@/server/core/db";
import { redis } from "@/server/core/redis";
import { logger } from "@/server/core/logger";
import { triggerPusher, pusherChannels } from "@/server/core/pusher";

const MATCH_CACHE_TTL = 60 * 60 * 6; // 6 hours

export interface MatchResult {
  talentId: string;
  score: number;
  reasons: {
    vectorSimilarity: number;
    rerankScore: number;
    blendedScore: number;
  };
}

export async function matchTalentForJob(
  jobId: string,
  opts: { topK?: number; topN?: number } = {},
): Promise<MatchResult[]> {
  const { topK = 100, topN = 25 } = opts;

  const cacheKey = `match:job:${jobId}`;
  if (redis) {
    const cached = await redis.get<MatchResult[]>(cacheKey);
    if (cached) {
      logger.debug({ jobId }, "returning cached job matches");
      return cached;
    }
  }

  const jobText = await buildJobText(jobId);
  const queryVector = await embedQuery(jobText);

  const index = getPineconeIndex();
  const ns = index.namespace(PN.talent);

  const queryResult = await ns.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  if (!queryResult.matches?.length) {
    logger.info({ jobId }, "no Pinecone matches found for job");
    return [];
  }

  const documents = queryResult.matches.map((m) => m.id);
  const vectorScoreMap = new Map(queryResult.matches.map((m) => [m.id, m.score ?? 0]));

  const cohere = requireCohere();
  const reranked = await cohere.rerank({
    model: COHERE_RERANK_MODEL,
    query: jobText,
    documents,
    topN,
    returnDocuments: false,
  });

  const results: MatchResult[] = reranked.results.map((r) => {
    const talentId = documents[r.index];
    const vectorSimilarity = vectorScoreMap.get(talentId) ?? 0;
    const rerankScore = r.relevanceScore;
    // Blend: 40% vector similarity, 60% rerank score
    const blendedScore = Math.round((0.4 * vectorSimilarity + 0.6 * rerankScore) * 100) / 100;

    return {
      talentId,
      score: blendedScore,
      reasons: { vectorSimilarity, rerankScore, blendedScore },
    };
  });

  // Persist JobMatch rows
  await prisma.$transaction(
    results.map((r) =>
      prisma.jobMatch.upsert({
        where: { jobId_talentId: { jobId, talentId: r.talentId } },
        create: {
          jobId,
          talentId: r.talentId,
          score: r.score,
          reasons: r.reasons,
        },
        update: {
          score: r.score,
          reasons: r.reasons,
          generatedAt: new Date(),
        },
      }),
    ),
  );

  // Notify top 10 talent via Pusher
  const top10 = results.slice(0, 10);
  await Promise.allSettled(
    top10.map((r) =>
      triggerPusher(pusherChannels.user(r.talentId), "job.matched", {
        jobId,
        score: r.score,
      }),
    ),
  );

  // Semantic cache
  if (redis) {
    await redis.set(cacheKey, results, { ex: MATCH_CACHE_TTL });
  }

  logger.info({ jobId, matchCount: results.length }, "job matching complete");
  return results;
}

export async function getJobMatches(
  jobId: string,
  limit = 25,
): Promise<Array<{ talentId: string; score: number; reasons: unknown; generatedAt: Date }>> {
  return prisma.jobMatch.findMany({
    where: { jobId },
    orderBy: { score: "desc" },
    take: limit,
  });
}
