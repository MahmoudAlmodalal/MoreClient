import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { listPlanCatalog, upsertPlanCatalog, upsertPlanSchema } from "@/server/admin/flags";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("support");
    const plans = await listPlanCatalog();
    return NextResponse.json({ items: plans });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("admin");
    const body = await request.json();
    const input = upsertPlanSchema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const plan = await upsertPlanCatalog(input, auditCtx);
    return NextResponse.json(plan);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
