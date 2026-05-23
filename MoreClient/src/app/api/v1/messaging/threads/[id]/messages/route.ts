import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { MessagingService, sendMessageSchema } from "@/server/messaging/service";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = parseLimit(url.searchParams.get("limit"), 50, 100);

    const result = await MessagingService.listMessages(ctx, id, { cursor, limit });
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const body = await request.json();
    const input = sendMessageSchema.parse(body);

    const message = await MessagingService.sendMessage(ctx, id, input);

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
