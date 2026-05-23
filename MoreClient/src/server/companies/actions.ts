"use server";

import { requireRole } from "../core/auth";
import { CompanyService } from "./service";
import { AppError, toAppError } from "../core/errors";
import { updateCompanySchema, updateMemberRoleSchema } from "@/schemas/company";
import { writeAudit, auditContextFromPrincipal } from "../audit";

export async function updateCompanyProfileAction(
  rawInput: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const ctx = await requireRole("admin");
    const input = updateCompanySchema.parse(rawInput);
    await CompanyService.updateProfile(ctx, input);
    await writeAudit(
      auditContextFromPrincipal(ctx),
      "company.update",
      "Company",
      ctx.company.id,
    );
    return { success: true };
  } catch (err) {
    const appErr = toAppError(err);
    return { success: false, error: appErr.message };
  }
}

export async function removeMemberAction(
  targetClerkUserId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const ctx = await requireRole("admin");
    await CompanyService.removeMember(ctx, targetClerkUserId);
    await writeAudit(
      auditContextFromPrincipal(ctx),
      "company.member.remove",
      "CompanyUser",
      targetClerkUserId,
    );
    return { success: true };
  } catch (err) {
    const appErr = toAppError(err);
    return { success: false, error: appErr.message };
  }
}

export async function updateMemberRoleAction(
  targetClerkUserId: string,
  rawInput: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const ctx = await requireRole("admin");
    const { role } = updateMemberRoleSchema.parse(rawInput);
    await CompanyService.updateMemberRole(ctx, targetClerkUserId, role);
    await writeAudit(
      auditContextFromPrincipal(ctx),
      "company.member.role_update",
      "CompanyUser",
      targetClerkUserId,
      { newRole: role },
    );
    return { success: true };
  } catch (err) {
    const appErr = toAppError(err);
    return { success: false, error: appErr.message };
  }
}
