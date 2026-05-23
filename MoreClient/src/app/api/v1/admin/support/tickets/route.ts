import { NextResponse } from "next/server";
import { requireAdmin, requirePrincipal } from "@/server/core/auth";
import { createTicket, listTickets, createTicketSchema } from "@/server/admin/support";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_user", "closed"]).optional(),
  assignedTo: z.string().optional(),
  cursor: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin("support");
    const url = new URL(request.url);
    const { status, assignedTo, cursor } = listSchema.parse(Object.fromEntries(url.searchParams));
    const limit = parseLimit(url.searchParams.get("limit"), 30, 100);
    const result = await listTickets({ status, assignedTo, cursor, limit, isAdmin: true });
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal();
    const body = await request.json();
    const input = createTicketSchema.parse(body);
    const ticket = await createTicket(ctx, input);
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
