import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, documents, documentChunks, learnedAnswers } from "../lib/db";
import { requireJwt } from "../middlewares/auth";
import { embedOne, toVectorLiteral } from "../lib/embeddings";

const router: IRouter = Router();

// Persist a Q&A as a single chunk so RAG retrieval can surface it later.
router.post("/learn", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const question = (req.body?.question || "").toString().trim();
  const answer = (req.body?.answer || "").toString().trim();
  const sourceHandoffId = req.body?.source_handoff_id
    ? Number(req.body.source_handoff_id)
    : null;
  if (!question || !answer) return res.status(400).json({ detail: "question and answer required" });

  const [learned] = await db
    .insert(learnedAnswers)
    .values({ tenantId, question, answer, sourceHandoffId })
    .returning();

  const [doc] = await db
    .insert(documents)
    .values({
      tenantId,
      name: `Learned: ${question.slice(0, 60)}`,
      type: "learned",
      sizeBytes: Buffer.byteLength(question + answer),
      status: "Indexed",
      source: `learned-${learned.id}`,
    })
    .returning();

  const text = `Q: ${question}\nA: ${answer}`;
  const emb = await embedOne(text);
  if (emb) {
    await db.execute(sql`
      INSERT INTO document_chunks (tenant_id, document_id, chunk_index, content, embedding)
      VALUES (${tenantId}, ${doc.id}, 0, ${text}, ${toVectorLiteral(emb)}::vector)
    `);
  } else {
    await db.insert(documentChunks).values({
      tenantId,
      documentId: doc.id,
      chunkIndex: 0,
      content: text,
    });
  }
  return res.json({ ok: true, id: learned.id, documentId: doc.id });
});

export default router;
