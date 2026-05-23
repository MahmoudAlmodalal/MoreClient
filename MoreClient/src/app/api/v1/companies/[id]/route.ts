import { NextResponse } from "next/server";
import { requirePrincipal, requireOwnership } from "@/server/core/auth";
import { CompanyService } from "@/server/companies/service";
import { CompanyRepo } from "@/server/companies/repo";
import { updateCompanySchema } from "@/schemas/company";
import { AppError, toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { checkRateLimit } from "@/server/core/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company"]);
    if (ctx.type !== "company") throw new AppError("FORBIDDEN", "Company account required", 403);

    // Enforce that the caller belongs to the requested company
    if (ctx.company.id !== id && ctx.type !== "admin") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const company = await CompanyService.getProfile(ctx);
    return NextResponse.json(company);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company"]);
    if (ctx.type !== "company") throw new AppError("FORBIDDEN", "Company account required", 403);
    if (ctx.company.id !== id) throw new AppError("FORBIDDEN", "Access denied", 403);

    await checkRateLimit("principalDefault", ctx.company.id);

    const body = await request.json();
    const input = updateCompanySchema.parse(body);
    const updated = await CompanyService.updateProfile(ctx, input);

    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "company.update",
      "Company",
      id,
    );

    return NextResponse.json(updated);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
