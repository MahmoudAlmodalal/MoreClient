import { requirePrincipal } from "@/server/core/auth";
import { createChatStream, chatRequestSchema } from "@/server/ai/chat";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { checkRateLimit } from "@/server/core/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal();
    if (!ctx) throw new AppError("UNAUTHORIZED", "Authentication required", 401);

    const principalId =
      ctx.type === "company" ? ctx.company.id : ctx.type === "talent" ? ctx.talent.id : "admin";

    await checkRateLimit("aiChat", principalId);

    const body = await request.json();
    const chatRequest = chatRequestSchema.parse(body);

    return createChatStream(ctx, chatRequest);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
