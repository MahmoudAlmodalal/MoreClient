import { Router, type IRouter } from "express";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, conversations, messages, handoffs } from "../lib/db";
import { requireJwt } from "../middlewares/auth";
import { timeAgo } from "../lib/serialize";

const router: IRouter = Router();

export async function buildAnalytics(tenantId: number) {
  const [msgCountRow] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.tenantId, tenantId), eq(messages.role, "user")));
  const totalQuestions = Number(msgCountRow?.n ?? 0);

  const [handoffCountRow] = await db
    .select({ n: count() })
    .from(handoffs)
    .where(eq(handoffs.tenantId, tenantId));
  const totalHandoffs = Number(handoffCountRow?.n ?? 0);

  const deflectionRate =
    totalQuestions > 0
      ? Math.max(0, Math.min(100, ((totalQuestions - totalHandoffs) / totalQuestions) * 100))
      : 0;

  // Channel distribution from conversations.
  const channelRows = await db
    .select({ channel: conversations.channel, n: count() })
    .from(conversations)
    .where(eq(conversations.tenantId, tenantId))
    .groupBy(conversations.channel);

  // Top user-questions by frequency.
  const topRows = await db.execute(sql`
    SELECT m.content AS name, COUNT(*) AS count
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.tenant_id = ${tenantId} AND m.role = 'user'
    GROUP BY m.content
    ORDER BY count DESC
    LIMIT 5
  `);
  const topQuestions = (topRows as unknown as { rows: { name: string; count: number }[] }).rows.map(
    (r) => ({ name: r.name, count: Number(r.count) }),
  );

  // Unanswered: pending handoffs with last user message.
  const pending = await db
    .select()
    .from(handoffs)
    .where(and(eq(handoffs.tenantId, tenantId), eq(handoffs.status, "pending")))
    .orderBy(desc(handoffs.createdAt))
    .limit(10);
  const unanswered = pending.map((h) => ({
    id: h.id,
    question: h.question,
    channel: h.channel,
    language: h.language,
    confidence: 0,
    timeAgo: timeAgo(h.createdAt),
  }));

  // Average CSAT score across resolved handoffs.
  const [csatRow] = await db
    .select({ avg: sql<number>`COALESCE(AVG(${handoffs.csatScore}), 0)` })
    .from(handoffs)
    .where(and(eq(handoffs.tenantId, tenantId), sql`${handoffs.csatScore} IS NOT NULL`));
  const feedbackScore = Number(csatRow?.avg ?? 0);

  return {
    kpis: {
      total_questions: totalQuestions,
      deflection_rate: Number(deflectionRate.toFixed(1)),
      cost_savings: Math.round(totalQuestions * 0.5 * 100) / 100,
      feedback_score: Number(feedbackScore.toFixed(2)),
    },
    top_questions: topQuestions,
    channel_distribution: channelRows.map((r) => ({ name: r.channel, value: Number(r.n) })),
    unanswered,
  };
}

router.get("/analytics", requireJwt, async (req, res) => {
  return res.json(await buildAnalytics(req.auth!.tid));
});

router.get("/analytics/dashboard", requireJwt, async (req, res) => {
  return res.json(await buildAnalytics(req.auth!.tid));
});

export default router;
