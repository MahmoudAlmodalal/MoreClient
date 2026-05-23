import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { listAdmins, createAdmin, createAdminSchema } from "@/server/admin/admins";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("super_admin");
    const admins = await listAdmins();
    return NextResponse.json({ items: admins });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const callerAdmin = await requireAdmin("super_admin");
    const body = await request.json();
    const input = createAdminSchema.parse(body);
    const auditCtx = auditContextFromAdmin(callerAdmin, request);
    const admin = await createAdmin(input, auditCtx);
    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
