import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminSuspendTalent } from "@/server/admin/talent";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(5).max(500) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("moderator");
    const { id } = await params;
    const body = await request.json();
    const { reason } = schema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const talent = await adminSuspendTalent(id, reason, auditCtx);
    return NextResponse.json(talent);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
