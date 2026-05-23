"use server";

import { requirePrincipal, requireRole } from "../core/auth";
import { ContractService } from "./service";
import { toAppError, AppError } from "../core/errors";
import { createContractSchema, addMilestoneSchema, updateMilestoneSchema } from "@/schemas/contract";
import { writeAudit, auditContextFromPrincipal } from "../audit";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function createContractAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireRole("recruiter");
    const input = createContractSchema.parse(rawInput);
    const contract = await ContractService.createContract(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "contract.create", "Contract", contract.id);
    return { success: true, data: { id: contract.id } };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function signContractAsCompanyAction(contractId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("admin");
    await ContractService.signAsCompany(ctx, contractId);
    await writeAudit(auditContextFromPrincipal(ctx), "contract.sign_company", "Contract", contractId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function signContractAsTalentAction(contractId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePrincipal(["talent"]);
    if (ctx.type !== "talent") throw new AppError("FORBIDDEN", "Talent account required", 403);
    await ContractService.signAsTalent(ctx, contractId);
    await writeAudit(auditContextFromPrincipal(ctx), "contract.sign_talent", "Contract", contractId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function addMilestoneAction(
  contractId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireRole("recruiter");
    const input = addMilestoneSchema.parse(rawInput);
    const milestone = await ContractService.addMilestone(ctx, contractId, input);
    await writeAudit(auditContextFromPrincipal(ctx), "milestone.add", "Milestone", milestone.id, { contractId });
    return { success: true, data: { id: milestone.id } };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function updateMilestoneAction(
  contractId: string,
  milestoneId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    const input = updateMilestoneSchema.parse(rawInput);
    await ContractService.updateMilestone(ctx, contractId, milestoneId, input);
    await writeAudit(auditContextFromPrincipal(ctx), "milestone.update", "Milestone", milestoneId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function deleteMilestoneAction(
  contractId: string,
  milestoneId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole("admin");
    await ContractService.deleteMilestone(ctx, contractId, milestoneId);
    await writeAudit(auditContextFromPrincipal(ctx), "milestone.delete", "Milestone", milestoneId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}
