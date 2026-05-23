import { NextResponse } from "next/server";
import { requirePrincipal } from "@/server/core/auth";
import { ContractService } from "@/server/contracts/service";
import { createContractSchema } from "@/schemas/contract";
import { toProblemJson, toAppError, AppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requirePrincipal(["company", "talent"]);
    if (ctx.type !== "company" && ctx.type !== "talent") {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }
    const contract = await ContractService.getContract(id, ctx);
    return NextResponse.json(contract);
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
