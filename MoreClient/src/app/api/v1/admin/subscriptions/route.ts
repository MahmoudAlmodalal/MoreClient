import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminListSubscriptions } from "@/server/admin/billing";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("support");
    const result = await adminListSubscriptions();
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
