import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { decideReport, decideModerationSchema } from "@/server/moderation/index";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("moderator");
    const { id } = await params;
    const body = await request.json();
    const input = decideModerationSchema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const result = await decideReport(id, input, auditCtx);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
