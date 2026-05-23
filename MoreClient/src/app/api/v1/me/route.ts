import { NextResponse } from "next/server";
import { resolvePrincipal } from "@/server/core/auth";
import { AppError, toProblemJson, toAppError } from "@/server/core/errors";
import { deleteAccount } from "@/server/gdpr/index";

export async function GET(request: Request) {
  try {
    const ctx = await resolvePrincipal();

    if (!ctx) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    if (ctx.type === "company") {
      return NextResponse.json({
        type: "company",
        companyId: ctx.company.id,
        companyName: ctx.company.name,
        companySlug: ctx.company.slug,
        role: ctx.companyUser.role,
        clerkUserId: ctx.clerkUserId,
        orgId: ctx.orgId,
        isAdmin: !!ctx.admin,
        planCode: ctx.company.planCode,
        verificationStatus: ctx.company.verificationStatus,
      });
    }

    if (ctx.type === "talent") {
      return NextResponse.json({
        type: "talent",
        talentId: ctx.talent.id,
        handle: ctx.talent.handle,
        displayName: ctx.talent.displayName,
        clerkUserId: ctx.clerkUserId,
        isAdmin: !!ctx.admin,
        planCode: ctx.talent.planCode,
        verificationStatus: ctx.talent.verificationStatus,
      });
    }

    // Admin only
    return NextResponse.json({
      type: "admin",
      adminId: ctx.admin.id,
      role: ctx.admin.role,
      clerkUserId: ctx.clerkUserId,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        toProblemJson(err, request.url),
        { status: err.status },
      );
    }
    const internalErr = new AppError("INTERNAL", "Internal server error", 500);
    return NextResponse.json(toProblemJson(internalErr), { status: 500 });
  }
}

/**
 * DELETE /api/v1/me — GDPR account deletion.
 * Requires { confirm: true } in body to prevent accidental deletion.
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await resolvePrincipal();
    if (!ctx) throw new AppError("UNAUTHORIZED", "Authentication required", 401);

    const body = await request.json().catch(() => ({}));
    if (!body?.confirm) {
      return NextResponse.json(
        { error: "Pass { confirm: true } in the request body to confirm account deletion" },
        { status: 400 },
      );
    }

    const result = await deleteAccount(ctx);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
