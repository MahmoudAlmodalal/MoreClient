import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminListCompanies, listCompaniesSchema } from "@/server/admin/companies";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("moderator");
    const url = new URL(request.url);
    const query = listCompaniesSchema.parse(Object.fromEntries(url.searchParams));
    const result = await adminListCompanies(query);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
