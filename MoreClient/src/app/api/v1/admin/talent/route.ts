import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/core/auth";
import { adminListTalent, listTalentSchema } from "@/server/admin/talent";
import { toProblemJson, toAppError } from "@/server/core/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin("moderator");
    const url = new URL(request.url);
    const query = listTalentSchema.parse(Object.fromEntries(url.searchParams));
    const result = await adminListTalent(query);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
