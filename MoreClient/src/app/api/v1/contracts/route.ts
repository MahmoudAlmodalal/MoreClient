import { NextResponse } from "next/server";
import { requireRole } from "@/server/core/auth";
import { ContractService } from "@/server/contracts/service";
import { createContractSchema } from "@/schemas/contract";
import { toProblemJson, toAppError } from "@/server/core/errors";
import { writeAudit, auditContextFromPrincipal } from "@/server/audit";

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("recruiter");
    const body = await request.json();
    const input = createContractSchema.parse(body);
    const contract = await ContractService.createContract(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx, request), "contract.create", "Contract", contract.id);
    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }
}
