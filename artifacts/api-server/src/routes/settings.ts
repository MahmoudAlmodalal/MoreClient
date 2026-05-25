import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, settings, messages, conversations } from "../lib/db";
import { ensureSettings, getSettings } from "../lib/tenant";
import { requireJwt } from "../middlewares/auth";
import { settingsOut } from "../lib/serialize";

const router: IRouter = Router();

async function usedMessages(tenantId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.tenantId, tenantId));
  return Number(row?.n ?? 0);
}

router.get("/settings", requireJwt, async (req, res) => {
  const tenantId = req.auth!.tid;
  const s = await ensureSettings(tenantId);
  return res.json(settingsOut(s, await usedMessages(tenantId)));
});

const ALLOWED_SETTINGS_KEYS = [
  "companyName", "botName", "companyLogo", "botTone", "systemPromptExtra",
  "telegramToken", "isTelegramActive", "twilioSid", "twilioToken", "twilioNumber",
  "isWhatsappActive", "subscriptionPlan", "confidenceThreshold",
  "purchaseFlowEnabled", "purchaseCollectAddress", "purchaseCollectQuantity",
  "purchaseAutoForwardToSupport", "purchaseConfirmationRequired",
  "purchaseSessionMinutes", "purchaseCurrencyLabel",
  "intentLlmEnabled", "intentConfidenceThreshold", "autoHandoffOnComplaint",
] as const;

async function updateSettings(req: import("express").Request, res: import("express").Response) {
  const tenantId = req.auth!.tid;
  await ensureSettings(tenantId);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED_SETTINGS_KEYS) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length > 0) {
    await db.update(settings).set(patch).where(eq(settings.tenantId, tenantId));
  }
  const s = await getSettings(tenantId);
  return res.json(settingsOut(s, await usedMessages(tenantId)));
}

router.put("/settings", requireJwt, updateSettings);
router.post("/settings", requireJwt, updateSettings);

export default router;
