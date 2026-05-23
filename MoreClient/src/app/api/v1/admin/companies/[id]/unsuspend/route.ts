import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminUnsuspendCompany } from "@/server/admin/companies";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("moderator");
    const { id } = await params;
    const auditCtx = auditContextFromAdmin(admin, request);
    const company = await adminUnsuspendCompany(id, auditCtx);
    return NextResponse.json(company);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
