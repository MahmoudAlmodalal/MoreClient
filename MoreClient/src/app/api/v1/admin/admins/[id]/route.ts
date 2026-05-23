import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { deactivateAdmin } from "@/server/admin/admins";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const callerAdmin = await requireAdmin("super_admin");
    const { id } = await params;
    const auditCtx = auditContextFromAdmin(callerAdmin, request);
    const admin = await deactivateAdmin(id, auditCtx);
    return NextResponse.json(admin);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
