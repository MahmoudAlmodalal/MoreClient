import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { createApiKey, listApiKeys } from "@/server/apikeys/service";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function GET(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    const keys = await listApiKeys(ctx);
    return NextResponse.json({ items: keys });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePrincipal(["company", "talent"]);
    const { name } = createSchema.parse(await request.json());

    const { key, secret, view } = await createApiKey(ctx, name);
    await writeAudit(auditContextFromPrincipal(ctx, request), "apiKey.create", "ApiKey", key.id);

    // `secret` is returned exactly once — it can never be retrieved again.
    return NextResponse.json({ ...view, secret }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
