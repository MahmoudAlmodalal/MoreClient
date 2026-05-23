import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { requestDataExport } from "@/server/gdpr/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal();
    const result = await requestDataExport(ctx);
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
