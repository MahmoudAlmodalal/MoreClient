import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { markAllRead } from "@/server/notifications/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import type { PrincipalType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);

    if (ctx.type === "admin") {
      return NextResponse.json({ updated: 0 });
    }

    const principalType: PrincipalType = ctx.type;
    const principalId = ctx.type === "company" ? ctx.company.id : ctx.talent.id;

    const updated = await markAllRead(principalType, principalId);
    return NextResponse.json({ updated });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
