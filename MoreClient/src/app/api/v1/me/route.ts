import { NextResponse } from "next/server";
import { resolvePrincipal } from "@/server/core/auth";
import { AppError, toProblemJson } from "@/server/core/errors";

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
