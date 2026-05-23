import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { AppError } from "./errors";

function createRatelimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

const limiters = {
  ipDefault: createRatelimiter(30, "1 m"),
  principalDefault: createRatelimiter(600, "1 m"),
  proposalSubmit: createRatelimiter(20, "1 h"),
  jobPost: createRatelimiter(50, "1 d"),
  aiMatch: createRatelimiter(5, "1 d"),
  aiChat: createRatelimiter(50, "1 d"),
  apiKey: createRatelimiter(60, "1 m"),
} as const;

type LimiterKey = keyof typeof limiters;

/**
 * Check a rate limit and throw AppError(RATE_LIMITED) if exceeded.
 * Silently passes if Redis is not configured (dev without Redis).
 */
export async function checkRateLimit(
  limiterKey: LimiterKey,
  identifier: string,
): Promise<void> {
  const limiter = limiters[limiterKey];
  if (!limiter) return;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests — please slow down.",
      429,
      { limit, remaining, resetAt: new Date(reset).toISOString() },
    );
  }
}

export { limiters };
