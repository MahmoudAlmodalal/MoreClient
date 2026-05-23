import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { MessagingService, startThreadSchema } from "@/server/messaging/service";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";

export async function GET(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = parseLimit(url.searchParams.get("limit"), 20, 50);

    const result = await MessagingService.listThreads(ctx, { cursor, limit });
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company"]);
    if (ctx.type !== "company") throw new AppError("FORBIDDEN", "Company account required", 403);

    const body = await request.json();
    const input = startThreadSchema.parse(body);

    const { thread, message } = await MessagingService.startThread(ctx, input);

    return NextResponse.json({ thread, message }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
