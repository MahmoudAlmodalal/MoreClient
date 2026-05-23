import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminBulkCompanyAction, bulkCompanyActionSchema } from "@/server/admin/companies";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("moderator");
    const input = bulkCompanyActionSchema.parse(await request.json());
    const auditCtx = auditContextFromAdmin(admin, request);
    const result = await adminBulkCompanyAction(input, auditCtx);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
