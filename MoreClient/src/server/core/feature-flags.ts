import { prisma } from "./db";
import { redis } from "./redis";
import { logger } from "./logger";

const CACHE_TTL_SECONDS = 60;

interface CachedFlag {
  enabled: boolean;
  rules: Record<string, unknown> | null;
}

function cacheKey(key: string): string {
  return `feature:${key}:global`;
}

/**
 * Read a feature flag (enabled + rules JSON), cached in Redis for a short TTL.
 * Falls back to a direct DB read when Redis is unavailable. The admin flags API
 * busts `feature:<key>:global` on write.
 */
export async function getFlag(key: string): Promise<CachedFlag> {
  if (redis) {
    try {
      const cached = await redis.get<CachedFlag>(cacheKey(key));
      if (cached) return cached;
    } catch {
      /* cache miss / unavailable — fall through to DB */
    }
  }

  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  const value: CachedFlag = {
    enabled: flag?.enabled ?? false,
    rules: (flag?.rules as Record<string, unknown> | null) ?? null,
  };

  if (redis) {
    redis.set(cacheKey(key), value, { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }
  return value;
}

/** Read a flag's rules only when the flag is enabled; otherwise null. */
export async function getEnabledFlagRules<T = Record<string, unknown>>(key: string): Promise<T | null> {
  const flag = await getFlag(key);
  if (!flag.enabled || !flag.rules) return null;
  return flag.rules as T;
}

// ─── Typed moderation automation rules ─────────────────────────────────────────

export interface KeywordBlocklistRules {
  terms?: string[];
  action?: "flag" | "block";
}

export interface RepeatOffenderRules {
  threshold?: number;
  windowDays?: number;
  action?: "suspend" | "ban";
}

export const MODERATION_FLAGS = {
  keywordBlocklist: "moderation_keyword_blocklist",
  repeatOffender: "moderation_repeat_offender",
} as const;

export async function getKeywordBlocklist(): Promise<Required<KeywordBlocklistRules> | null> {
  const rules = await getEnabledFlagRules<KeywordBlocklistRules>(MODERATION_FLAGS.keywordBlocklist);
  if (!rules) return null;
  const terms = (rules.terms ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (!terms.length) return null;
  return { terms, action: rules.action ?? "flag" };
}

export async function getRepeatOffenderRule(): Promise<Required<RepeatOffenderRules> | null> {
  const rules = await getEnabledFlagRules<RepeatOffenderRules>(MODERATION_FLAGS.repeatOffender);
  if (!rules) return null;
  const threshold = rules.threshold ?? 0;
  if (threshold < 1) return null;
  return { threshold, windowDays: rules.windowDays ?? 30, action: rules.action ?? "suspend" };
}

export function logFlagError(key: string, err: unknown): void {
  logger.warn({ key, err: (err as Error).message }, "feature flag read failed");
}
