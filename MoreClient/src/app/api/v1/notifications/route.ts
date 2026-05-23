import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { listNotifications } from "@/server/notifications/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { parseLimit } from "@/server/core/pagination";
import type { PrincipalType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);

    // Admin-only principals have no notification inbox.
    if (ctx.type === "admin") {
      return NextResponse.json({ items: [], nextCursor: null, hasMore: false, unreadCount: 0 });
    }

    const principalType: PrincipalType = ctx.type;
    const principalId = ctx.type === "company" ? ctx.company.id : ctx.talent.id;

    const url = new URL(request.url);
    const result = await listNotifications({
      principalType,
      principalId,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"), 20, 50),
    });

    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
