import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminVerifyCompany } from "@/server/admin/companies";
import { auditContextFromAdmin } from "@/server/audit/index";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["verified", "rejected"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("moderator");
    const { id } = await params;
    const body = await request.json();
    const { decision } = schema.parse(body);
    const auditCtx = auditContextFromAdmin(admin, request);
    const company = await adminVerifyCompany(id, decision, auditCtx);
    return NextResponse.json(company);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
