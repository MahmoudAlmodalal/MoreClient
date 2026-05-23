import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminBulkTalentAction, bulkTalentActionSchema } from "@/server/admin/talent";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("moderator");
    const input = bulkTalentActionSchema.parse(await request.json());
    const auditCtx = auditContextFromAdmin(admin, request);
    const result = await adminBulkTalentAction(input, auditCtx);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
