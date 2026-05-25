import { Router, type IRouter } from "express";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import os from "node:os";
import { db, tenants, conversations, messages, settings } from "../lib/db";
import { requireAdminKey } from "../middlewares/auth";
import { tenantOut } from "../lib/serialize";
import { hasLlm, OPENAI_API_KEY, GEMINI_API_KEY } from "../lib/env";
import { slugifyTenantKey } from "../lib/tenant";

const router: IRouter = Router();
router.use(requireAdminKey);

const PLAN_PRICE: Record<string, number> = { pro: 49, ultra: 199, custom: 0 };

router.get("/admin/tenants", async (req, res) => {
  const search = (req.query["search"] as string | undefined) || "";
  const plan = (req.query["plan"] as string | undefined) || "all";
  const status = (req.query["status"] as string | undefined) || "all";
  const filters = [] as Array<ReturnType<typeof eq>>;
  if (plan !== "all") filters.push(eq(tenants.plan, plan));
  if (status !== "all") filters.push(eq(tenants.status, status));
  const searchClause = search
    ? or(ilike(tenants.name, `%${search}%`), ilike(tenants.email, `%${search}%`))
    : undefined;
  const where = searchClause
    ? filters.length > 0
      ? and(searchClause, ...filters)
      : searchClause
    : filters.length > 0
      ? and(...filters)
      : undefined;
  const rows = where
    ? await db.select().from(tenants).where(where).orderBy(desc(tenants.createdAt))
    : await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  return res.json(rows.map(tenantOut));
});

router.post("/admin/tenants", async (req, res) => {
  const { name, email, plan, limitMessages, tenantKey } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ detail: "name and email required" });
  const key = (tenantKey as string | undefined) || slugifyTenantKey(name);
  const [created] = await db
    .insert(tenants)
    .values({
      tenantKey: key,
      name,
      email,
      plan: plan || "pro",
      limitMessages: Number(limitMessages) || 500,
    })
    .returning();
  await db.insert(settings).values({ tenantId: created.id, companyName: name });
  return res.json(tenantOut(created));
});

router.put("/admin/tenants/:id", async (req, res) => {
  const id = Number(req.params.id);
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "email", "plan", "limitMessages"]) {
    if (k in req.body) patch[k] = req.body[k];
  }
  if (patch["limitMessages"] !== undefined) patch["limitMessages"] = Number(patch["limitMessages"]);
  if (Object.keys(patch).length > 0) {
    await db.update(tenants).set(patch).where(eq(tenants.id, id));
  }
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!t) return res.status(404).json({ detail: "Not found" });
  return res.json(tenantOut(t));
});

router.delete("/admin/tenants/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(tenants).where(eq(tenants.id, id));
  return res.json({ ok: true });
});

router.post("/admin/tenants/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!t) return res.status(404).json({ detail: "Not found" });
  const next = t.status === "active" ? "inactive" : "active";
  await db.update(tenants).set({ status: next }).where(eq(tenants.id, id));
  const [updated] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return res.json(tenantOut(updated));
});

router.get("/admin/kpis", async (_req, res) => {
  const allTenants = await db.select().from(tenants);
  const activeTenants = allTenants.filter((t) => t.status === "active").length;
  const totalMrr = allTenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + (PLAN_PRICE[t.plan] ?? 0), 0);
  const [msgRow] = await db.select({ n: count() }).from(messages);
  return res.json({
    activeTenants,
    totalTenants: allTenants.length,
    totalMrr,
    globalMessages: Number(msgRow?.n ?? 0),
  });
});

router.get("/admin/health", async (_req, res) => {
  const start = Date.now();
  let dbLatency = -1;
  try {
    await db.execute(sql`SELECT 1`);
    dbLatency = Date.now() - start;
  } catch {
    dbLatency = -1;
  }
  let vectorStatus = "unavailable";
  try {
    const r = (await db.execute(sql`SELECT extname FROM pg_extension WHERE extname='vector'`)) as unknown as {
      rows: { extname: string }[];
    };
    if (r.rows.length > 0) vectorStatus = "ok";
  } catch {
    /* leave unavailable */
  }
  const mem = process.memoryUsage();
  const total = os.totalmem();
  const memPct = total > 0 ? Math.round((mem.rss / total) * 100) : 0;
  const cpus = os.cpus();
  const cpuPct = cpus.length > 0 ? Math.round(os.loadavg()[0] * 100 / cpus.length) : 0;
  const llmStatus = hasLlm()
    ? OPENAI_API_KEY && GEMINI_API_KEY
      ? "ok"
      : "partial"
    : "keyless";
  // suppress unused
  void conversations;
  return res.json({
    dbLatencyMs: dbLatency,
    chromaStatus: vectorStatus,
    memoryUsagePercent: memPct,
    cpuUsagePercent: cpuPct,
    llmProviderStatus: llmStatus,
  });
});

export default router;
