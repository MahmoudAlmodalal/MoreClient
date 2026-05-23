import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { semanticSearch, searchQuerySchema } from "@/server/ai/search";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { checkRateLimit } from "@/server/core/rate-limit";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal();
    if (!ctx) throw new AppError("UNAUTHORIZED", "Authentication required", 401);

    const principalId =
      ctx.type === "company" ? ctx.company.id : ctx.type === "talent" ? ctx.talent.id : "admin";

    await checkRateLimit("aiMatch", principalId);

    const body = await request.json();
    const query = searchQuerySchema.parse(body);

    const results = await semanticSearch(query);

    return NextResponse.json({ items: results, total: results.length });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
