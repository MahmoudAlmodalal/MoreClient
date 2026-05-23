import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { getPlatformMetrics } from "@/server/analytics/platform";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function GET(request: Request) {
  try {
    await requireAdmin("support");
    const url = new URL(request.url);
    const { days } = schema.parse(Object.fromEntries(url.searchParams));
    const metrics = await getPlatformMetrics({ days });
    // Convert BigInt to string for JSON serialization
    const serialized = metrics.map((m) => ({
      ...m,
      gmvCents: m.gmvCents.toString(),
      commissionCents: m.commissionCents.toString(),
    }));
    return NextResponse.json({ items: serialized, days });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
