import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { getReport } from "@/server/moderation/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("moderator");
    const { id } = await params;
    const report = await getReport(id);
    return NextResponse.json(report);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
