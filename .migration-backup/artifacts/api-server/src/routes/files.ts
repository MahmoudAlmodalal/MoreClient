import { Router, type IRouter } from "express";
import multer from "multer";
import { sql, eq, and, count } from "drizzle-orm";
import { db, documents, documentChunks, tenants } from "../lib/db";
import { requireJwt } from "../middlewares/auth";
import { extractText, chunkText } from "../lib/parser";
import { embedTexts, toVectorLiteral } from "../lib/embeddings";
import { fileOut } from "../lib/serialize";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router: IRouter = Router();

router.get("/files", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const tenantKey = req.auth!.tk;
  const docs = await db.select().from(documents).where(eq(documents.tenantId, tenantId));
  const counts = new Map<number, number>();
  if (docs.length > 0) {
    const rows = await db
      .select({ documentId: documentChunks.documentId, n: count() })
      .from(documentChunks)
      .where(eq(documentChunks.tenantId, tenantId))
      .groupBy(documentChunks.documentId);
    for (const r of rows) counts.set(r.documentId, Number(r.n));
  }
  return res.json(docs.map((d) => fileOut(d, tenantKey, counts.get(d.id) ?? 0)));
});

async function processAndStore(
  tenantId: number,
  filename: string,
  mimetype: string,
  buffer: Buffer,
): Promise<{ documentId: number; chunkCount: number; status: string; type: string }> {
  const parsed = await extractText(buffer, filename, mimetype);
  const chunks = chunkText(parsed.text, 800);
  const [doc] = await db
    .insert(documents)
    .values({
      tenantId,
      name: filename,
      type: parsed.type,
      sizeBytes: buffer.length,
      status: chunks.length > 0 ? "indexed" : "empty",
    })
    .returning();

  if (chunks.length === 0) {
    return { documentId: doc.id, chunkCount: 0, status: "empty", type: parsed.type };
  }

  const embeddings = await embedTexts(chunks);
  for (let i = 0; i < chunks.length; i++) {
    const emb = embeddings[i];
    if (emb) {
      await db.execute(sql`
        INSERT INTO document_chunks (tenant_id, document_id, chunk_index, content, embedding)
        VALUES (${tenantId}, ${doc.id}, ${i}, ${chunks[i]}, ${toVectorLiteral(emb)}::vector)
      `);
    } else {
      await db.insert(documentChunks).values({
        tenantId,
        documentId: doc.id,
        chunkIndex: i,
        content: chunks[i],
      });
    }
  }
  return { documentId: doc.id, chunkCount: chunks.length, status: "indexed", type: parsed.type };
}

// Canonical upload endpoint. Both web and mobile call this path through
// their shared api.ts helper.
router.post("/files/upload", requireJwt, upload.single("file"), async (req, res) => {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) return res.status(400).json({ detail: "No file uploaded" });
  const tenantId = req.auth!.tid;
  try {
    const result = await processAndStore(tenantId, file.originalname, file.mimetype, file.buffer);
    return res.json({ file: file.originalname, chunks: result.chunkCount, status: result.status });
  } catch (err) {
    return res.status(500).json({ detail: (err as Error).message || "Upload failed" });
  }
});

router.delete("/files/:id", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ detail: "Bad id" });
  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .limit(1);
  if (!existing) return res.status(404).json({ detail: "Not found" });
  // Cascade fires on chunks (FK onDelete: cascade), no orphan vectors left.
  await db.delete(documents).where(eq(documents.id, id));
  return res.json({ ok: true });
});

export { processAndStore };
export default router;

// Silence unused-import warning when re-exported.
void tenants;
