import { eq } from "drizzle-orm";
import { db, handoffs, conversations, settings, type Handoff } from "./db";
import { broadcastChat } from "./ws";
import { logger } from "./logger";

type DeliveryResult = { ok: boolean; detail?: string };

// Dispatch an agent reply to the originating channel. Web uses the chat WS;
// Telegram/WhatsApp call the respective HTTP APIs when credentials are set.
async function dispatchOnce(
  handoff: Handoff,
  sessionId: string,
  content: string,
): Promise<DeliveryResult> {
  if (handoff.channel === "web") {
    const ok = broadcastChat(sessionId, {
      type: "agent.message",
      handoffId: handoff.id,
      content,
      time: new Date().toISOString(),
    });
    // Web is "fire and forget"; treat as delivered even with no live client
    // because the widget will pick it up via /api/chat/:sessionId/agent-messages polling.
    return { ok: true, detail: ok ? "delivered live" : "queued for poll" };
  }

  // Look up per-tenant settings for channel creds.
  const [tenantSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, handoff.tenantId))
    .limit(1);

  if (handoff.channel === "telegram") {
    const token = tenantSettings?.telegramToken;
    if (!token || !tenantSettings?.isTelegramActive) {
      return { ok: false, detail: "Telegram not configured" };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: sessionId, text: content }),
      });
      if (!res.ok) return { ok: false, detail: `Telegram ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }

  if (handoff.channel === "whatsapp") {
    const sid = tenantSettings?.twilioSid;
    const tok = tenantSettings?.twilioToken;
    const from = tenantSettings?.twilioNumber;
    if (!sid || !tok || !from || !tenantSettings?.isWhatsappActive) {
      return { ok: false, detail: "WhatsApp not configured" };
    }
    try {
      const body = new URLSearchParams({
        To: `whatsapp:${sessionId}`,
        From: `whatsapp:${from}`,
        Body: content,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );
      if (!res.ok) return { ok: false, detail: `Twilio ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }

  return { ok: false, detail: `Unknown channel: ${handoff.channel}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 3-attempt retry with exponential backoff (1s/2s/4s). Updates delivery_status
// + delivery_attempts on every attempt so the dashboard sees real state.
export async function deliverHandoffReply(
  handoffId: number,
  content: string,
): Promise<DeliveryResult> {
  const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, handoffId)).limit(1);
  if (!handoff) return { ok: false, detail: "Handoff not found" };
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, handoff.conversationId))
    .limit(1);
  const sessionId = conv?.customerRef || "";

  let last: DeliveryResult = { ok: false, detail: "no attempts" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    last = await dispatchOnce(handoff, sessionId, content);
    await db
      .update(handoffs)
      .set({
        deliveryAttempts: attempt,
        deliveryStatus: last.ok ? "delivered" : "failed",
        deliveryDetail: last.detail ?? null,
      })
      .where(eq(handoffs.id, handoffId));
    if (last.ok) return last;
    if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1));
  }
  logger.warn({ handoffId, last }, "Handoff delivery exhausted retries");
  return last;
}
