import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { replyToTicket, replyTicketSchema } from "@/server/admin/support";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin("support");
    const { id } = await params;
    const body = await request.json();
    const input = replyTicketSchema.parse(body);
    const message = await replyToTicket(id, "admin", admin.clerkUserId, input);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
