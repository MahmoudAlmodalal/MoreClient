import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { CompanyService } from "@/server/companies/service";
import { AppError, toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company"]);
    if (ctx.type !== "company") throw new AppError("FORBIDDEN", "Company account required", 403);
    if (ctx.company.id !== id) throw new AppError("FORBIDDEN", "Access denied", 403);

    const members = await CompanyService.getMembers(ctx);
    return NextResponse.json({ members });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company"]);
    if (ctx.type !== "company") throw new AppError("FORBIDDEN", "Company account required", 403);
    if (ctx.company.id !== id) throw new AppError("FORBIDDEN", "Access denied", 403);

    const { searchParams } = new URL(request.url);
    const targetClerkUserId = searchParams.get("userId");
    if (!targetClerkUserId) throw new AppError("BAD_REQUEST", "userId is required", 400);

    await CompanyService.removeMember(ctx, targetClerkUserId);
    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "company.member.remove",
      "CompanyUser",
      targetClerkUserId,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
