import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { getConnectStatus } from "@/server/billing/connect";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);

    const result = await getConnectStatus(ctx.talent.id);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
