from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.embeddings import embed_one


async def hybrid_search(db: AsyncSession, tenant_id: int, query: str, limit: int = 5) -> list[dict]:
    embedding = await embed_one(query)

    if embedding is None:
        # Lexical-only fallback
        sql = text("""
            SELECT dc.id, dc.content,
                   ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', :q)) AS score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.tenant_id = :tid
              AND d.status = 'indexed'
              AND dc.content ILIKE '%' || :q || '%'
            ORDER BY score DESC
            LIMIT :lim
        """)
        result = await db.execute(sql, {"tid": tenant_id, "q": query, "lim": limit})
        rows = result.mappings().all()
        return [{"content": r["content"], "score": float(r["score"]), "document_id": 0} for r in rows]

    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"

    sql = text("""
        WITH vec AS (
            SELECT dc.id,
                   dc.content,
                   dc.document_id,
                   1 - (dc.embedding <=> :vec::vector) AS vec_score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.tenant_id = :tid
              AND d.status = 'indexed'
              AND dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> :vec::vector
            LIMIT 20
        ),
        lex AS (
            SELECT dc.id,
                   ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', :q)) AS lex_score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.tenant_id = :tid
              AND d.status = 'indexed'
              AND dc.content ILIKE '%' || :q || '%'
            LIMIT 20
        )
        SELECT
            COALESCE(vec.id, lex.id) AS id,
            COALESCE(vec.content, (
                SELECT content FROM document_chunks WHERE id = lex.id
            )) AS content,
            COALESCE(vec.document_id, 0) AS document_id,
            (COALESCE(vec.vec_score, 0) * 0.7 + COALESCE(lex.lex_score, 0) * 0.3) AS score
        FROM vec
        FULL OUTER JOIN lex ON vec.id = lex.id
        ORDER BY score DESC
        LIMIT :lim
    """)
    result = await db.execute(sql, {"tid": tenant_id, "vec": vec_str, "q": query, "lim": limit})
    rows = result.mappings().all()
    return [
        {"content": r["content"], "score": float(r["score"]), "document_id": int(r["document_id"])}
        for r in rows if r["content"]
    ]
