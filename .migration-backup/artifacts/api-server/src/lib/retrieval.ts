import { sql } from "drizzle-orm";
import { db, documentChunks } from "./db";
import { embedOne, toVectorLiteral } from "./embeddings";

export type RetrievedChunk = { content: string; score: number; documentId: number };

// Hybrid search: vector cosine (if embedding available) + lexical ILIKE.
// Falls back to lexical-only when embeddings are unavailable.
export async function hybridSearch(
  tenantId: number,
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const vec = await embedOne(trimmed);

  const rows = await db.execute(sql`
    WITH lexical AS (
      SELECT id, content, document_id,
        ts_rank_cd(to_tsvector('simple', content), plainto_tsquery('simple', ${trimmed})) AS lex_score
      FROM document_chunks
      WHERE tenant_id = ${tenantId}
        AND content ILIKE ${"%" + trimmed + "%"}
      LIMIT 20
    ),
    vector_match AS (
      ${
        vec
          ? sql`SELECT id, content, document_id,
                1 - (embedding <=> ${toVectorLiteral(vec)}::vector) AS vec_score
            FROM document_chunks
            WHERE tenant_id = ${tenantId}
              AND embedding IS NOT NULL
            ORDER BY embedding <=> ${toVectorLiteral(vec)}::vector
            LIMIT 20`
          : sql`SELECT id, content, document_id, 0::float AS vec_score
            FROM document_chunks WHERE false`
      }
    ),
    merged AS (
      SELECT
        COALESCE(v.id, l.id) AS id,
        COALESCE(v.content, l.content) AS content,
        COALESCE(v.document_id, l.document_id) AS document_id,
        COALESCE(v.vec_score, 0) AS vec_score,
        COALESCE(l.lex_score, 0) AS lex_score
      FROM vector_match v
      FULL OUTER JOIN lexical l ON l.id = v.id
    )
    SELECT id, content, document_id,
           (0.7 * vec_score + 0.3 * LEAST(lex_score, 1.0)) AS score
    FROM merged
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  // drizzle node-postgres returns { rows }
  const list = (rows as unknown as { rows: Array<{ content: string; score: number; document_id: number }> })
    .rows;
  return list.map((r) => ({
    content: r.content,
    score: Number(r.score) || 0,
    documentId: r.document_id,
  }));
}

// Best-effort cosine confidence — returns 0 when there's nothing relevant.
export function confidenceFrom(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  const top = chunks[0]?.score ?? 0;
  return Math.max(0, Math.min(1, top));
}
