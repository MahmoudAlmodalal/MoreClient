import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminGetCompany } from "@/server/admin/companies";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("moderator");
    const { id } = await params;
    const company = await adminGetCompany(id);
    return NextResponse.json(company);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
