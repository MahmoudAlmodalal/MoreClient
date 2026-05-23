import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { TalentService } from "@/server/talent/service";
import { TalentRepo } from "@/server/talent/repo";
import { updateTalentProfileSchema } from "@/schemas/talent";
import { AppError, toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { checkRateLimit } from "@/server/core/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal();

    // Talent can only read their own private profile; companies/admins can read any talent
    if (ctx.type === "talent" && ctx.talent.id !== id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const talent = await TalentRepo.findById(id);
    if (!talent) throw new AppError("NOT_FOUND", "Talent not found", 404);

    return NextResponse.json(talent);
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
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);
    if (ctx.talent.id !== id) throw new AppError("FORBIDDEN", "Access denied", 403);

    await checkRateLimit("principalDefault", ctx.talent.id);

    const body = await request.json();
    const input = updateTalentProfileSchema.parse(body);
    const updated = await TalentService.updateProfile(ctx, input);

    await writeAudit(
      auditContextFromPrincipal(ctx, request),
      "talent.update",
      "Talent",
      id,
    );

    return NextResponse.json(updated);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
