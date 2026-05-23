import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { revokeApiKey } from "@/server/apikeys/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    const { id } = await params;

    await revokeApiKey(ctx, id);
    await writeAudit(auditContextFromPrincipal(ctx, request), "apiKey.revoke", "ApiKey", id);

    return NextResponse.json({ revoked: true });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
