import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { assignTicket, assignTicketSchema } from "@/server/admin/support";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("support");
    const { id } = await params;
    const body = await request.json();
    const { adminClerkUserId } = assignTicketSchema.parse(body);
    const ticket = await assignTicket(id, adminClerkUserId);
    return NextResponse.json(ticket);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
