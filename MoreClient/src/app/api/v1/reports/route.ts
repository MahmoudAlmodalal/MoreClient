import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { submitReport, submitReportSchema } from "@/server/moderation/index";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Account required", 403);
    }

    const body = await request.json();
    const input = submitReportSchema.parse(body);

    const reporterType = ctx.type === "company" ? "company_user" : "talent";
    const reporterId = ctx.clerkUserId;

    const report = await submitReport(reporterType, reporterId, input);
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
