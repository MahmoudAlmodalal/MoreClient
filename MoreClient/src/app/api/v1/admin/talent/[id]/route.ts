import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminGetTalent } from "@/server/admin/talent";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("moderator");
    const { id } = await params;
    const talent = await adminGetTalent(id);
    return NextResponse.json(talent);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
