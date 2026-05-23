import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { getTicket } from "@/server/admin/support";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("support");
    const { id } = await params;
    const ticket = await getTicket(id, undefined, true);
    return NextResponse.json(ticket);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
