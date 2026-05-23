import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { queryAuditLog, auditLogQuerySchema } from "@/server/admin/audit-log";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("admin");
    const url = new URL(request.url);
    const query = auditLogQuerySchema.parse(Object.fromEntries(url.searchParams));
    const result = await queryAuditLog(query);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
