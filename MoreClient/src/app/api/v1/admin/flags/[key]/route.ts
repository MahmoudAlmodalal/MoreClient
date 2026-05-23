import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { deleteFeatureFlag } from "@/server/admin/flags";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const admin = await requireAdmin("admin");
    const { key } = await params;
    const auditCtx = auditContextFromAdmin(admin, request);
    await deleteFeatureFlag(key, auditCtx);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
