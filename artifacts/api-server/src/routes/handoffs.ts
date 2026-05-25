import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, handoffs, conversations, messages } from "../lib/db";
import { requireJwt } from "../middlewares/auth";
import { handoffOut } from "../lib/serialize";
import { deliverHandoffReply } from "../lib/delivery";
import { broadcastDashboard } from "../lib/ws";

const router: IRouter = Router();

async function loadHandoff(id: number, tenantId: number) {
  const [h] = await db
    .select()
    .from(handoffs)
    .where(and(eq(handoffs.id, id), eq(handoffs.tenantId, tenantId)))
    .limit(1);
  if (!h) return null;
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, h.conversationId))
    .limit(1);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, h.conversationId))
    .orderBy(messages.id);
  return { handoff: h, conv, msgs };
}

router.get("/handoffs", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const status = (req.query["status"] as string | undefined) || undefined;
  const channel = (req.query["channel"] as string | undefined) || undefined;
  const filters = [eq(handoffs.tenantId, tenantId)];
  if (status === "pending" || status === "resolved") filters.push(eq(handoffs.status, status));
  if (channel) filters.push(eq(handoffs.channel, channel));
  const rows = await db
    .select()
    .from(handoffs)
    .where(and(...filters))
    .orderBy(desc(handoffs.createdAt))
    .limit(200);

  if (rows.length === 0) return res.json([]);
  const convIds = Array.from(new Set(rows.map((r) => r.conversationId)));
  const convs = await db.select().from(conversations).where(inArray(conversations.id, convIds));
  const convMap = new Map(convs.map((c) => [c.id, c]));
  const msgs = await db
    .select()
    .from(messages)
    .where(inArray(messages.conversationId, convIds))
    .orderBy(messages.id);
  const msgMap = new Map<number, typeof msgs>();
  for (const m of msgs) {
    const list = msgMap.get(m.conversationId) || [];
    list.push(m);
    msgMap.set(m.conversationId, list);
  }
  return res.json(
    rows.map((h) => handoffOut(h, convMap.get(h.conversationId), msgMap.get(h.conversationId) || [])),
  );
});

router.post("/handoffs/:id/reply", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const id = Number(req.params.id);
  const content = (req.body?.content || req.body?.message || "").toString().trim();
  if (!content) return res.status(400).json({ detail: "content required" });
  const loaded = await loadHandoff(id, tenantId);
  if (!loaded) return res.status(404).json({ detail: "Not found" });

  await db.insert(messages).values({
    conversationId: loaded.handoff.conversationId,
    role: "agent",
    content,
  });
  await db.update(handoffs).set({ unreplied: false }).where(eq(handoffs.id, id));

  const delivery = await deliverHandoffReply(id, content);
  broadcastDashboard(tenantId, {
    type: "handoff.replied",
    data: { id, delivery },
  });

  const updated = await loadHandoff(id, tenantId);
  return res.json(handoffOut(updated!.handoff, updated!.conv, updated!.msgs));
});

router.post("/handoffs/:id/resolve", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const id = Number(req.params.id);
  const loaded = await loadHandoff(id, tenantId);
  if (!loaded) return res.status(404).json({ detail: "Not found" });
  await db
    .update(handoffs)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(handoffs.id, id));
  broadcastDashboard(tenantId, { type: "handoff.resolved", data: { id } });
  return res.json({ ok: true });
});

router.post("/handoffs/:id/feedback", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const id = Number(req.params.id);
  const score = Number(req.body?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ detail: "score must be 1-5" });
  }
  const result = await db
    .update(handoffs)
    .set({ csatScore: score })
    .where(and(eq(handoffs.id, id), eq(handoffs.tenantId, tenantId)));
  void result;
  return res.json({ ok: true });
});

router.post("/handoffs/:id/retry-delivery", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const id = Number(req.params.id);
  const loaded = await loadHandoff(id, tenantId);
  if (!loaded) return res.status(404).json({ detail: "Not found" });
  const lastAgent = [...loaded.msgs].reverse().find((m) => m.role === "agent");
  if (!lastAgent) return res.status(400).json({ detail: "No agent reply to retry" });
  await db
    .update(handoffs)
    .set({ deliveryAttempts: 0, deliveryStatus: "pending", deliveryDetail: null })
    .where(eq(handoffs.id, id));
  const delivery = await deliverHandoffReply(id, lastAgent.content);
  return res.json({ delivery });
});

export default router;
