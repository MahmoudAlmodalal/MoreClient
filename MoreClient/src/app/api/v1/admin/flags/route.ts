import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { listFeatureFlags, upsertFeatureFlag, upsertFlagSchema } from "@/server/admin/flags";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("support");
    const flags = await listFeatureFlags();
    return NextResponse.json({ items: flags });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("admin");
    const body = await request.json();
    const input = upsertFlagSchema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const flag = await upsertFeatureFlag(input, auditCtx);
    return NextResponse.json(flag);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
