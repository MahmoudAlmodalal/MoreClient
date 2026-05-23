import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminFeatureTalent } from "@/server/admin/talent";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({
  featuredUntil: z.string().datetime().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("admin");
    const { id } = await params;
    const body = await request.json();
    const { featuredUntil } = schema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const talent = await adminFeatureTalent(id, featuredUntil ? new Date(featuredUntil) : null, auditCtx);
    return NextResponse.json(talent);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
