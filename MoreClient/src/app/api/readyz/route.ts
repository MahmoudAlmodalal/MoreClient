import { prisma } from "@/server/core/db";
import { redis } from "@/server/core/redis";
import { stripe } from "@/server/core/stripe";

interface Check {
  name: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

async function checkPostgres(): Promise<Check> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "postgres", ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: "postgres",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function checkRedis(): Promise<Check> {
  const start = Date.now();
  if (!redis) {
    return { name: "redis", ok: true, latencyMs: 0, error: "not configured (skipped)" };
  }
  try {
    await redis.ping();
    return { name: "redis", ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: "redis",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function checkStripe(): Promise<Check> {
  const start = Date.now();
  if (!stripe) {
    return { name: "stripe", ok: true, latencyMs: 0, error: "not configured (skipped)" };
  }
  try {
    // Light-weight API call to verify connectivity
    await stripe.balance.retrieve();
    return { name: "stripe", ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: "stripe",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function GET() {
  const [postgres, redisCheck, stripeCheck] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkStripe(),
  ]);

  const checks = [postgres, redisCheck, stripeCheck];
  const allOk = checks.every((c) => c.ok);

  return new Response(
    JSON.stringify({
      status: allOk ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: allOk ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
