import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { ContractService } from "@/server/contracts/service";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company", "talent"]);

    if (ctx.type === "company") {
      const contract = await ContractService.signAsCompany(ctx, id);
      await writeAudit(auditContextFromPrincipal(ctx, request), "contract.sign_company", "Contract", id);
      return NextResponse.json(contract);
    } else if (ctx.type === "talent") {
      const contract = await ContractService.signAsTalent(ctx, id);
      await writeAudit(auditContextFromPrincipal(ctx, request), "contract.sign_talent", "Contract", id);
      return NextResponse.json(contract);
    }

    throw new AppError("FORBIDDEN", "Access denied", 403);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
