import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { listReports } from "@/server/moderation/index";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "dismissed"]).optional(),
  cursor: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin("moderator");
    const url = new URL(request.url);
    const { status, cursor } = querySchema.parse(Object.fromEntries(url.searchParams));
    const limit = parseLimit(url.searchParams.get("limit"), 50, 100);
    const result = await listReports({ status, cursor, limit });
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
