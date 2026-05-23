import type { Company, CompanyUser } from "@prisma/client";
import { CompanyRepo } from "./repo";
import { AppError } from "../core/errors";
import type { CompanyContext } from "../core/auth";
import type { UpdateCompanyInput, InviteMemberInput } from "@/schemas/company";

export class CompanyService {
  /**
   * Get the authenticated company's full profile.
   * Enforces that the caller is a member of this company.
   */
  static async getProfile(ctx: CompanyContext): Promise<Company> {
    const company = await CompanyRepo.findById(ctx.company.id);
    if (!company) throw new AppError("NOT_FOUND", "Company not found", 404);
    return company;
  }

  /**
   * Update company profile fields.
   * Caller must be at least 'admin' role (enforced at route/action layer).
   */
  static async updateProfile(
    ctx: CompanyContext,
    input: UpdateCompanyInput,
  ): Promise<Company> {
    return CompanyRepo.update(ctx.company.id, input);
  }

  /**
   * Get all members of the caller's company.
   */
  static async getMembers(ctx: CompanyContext): Promise<CompanyUser[]> {
    return CompanyRepo.getMembers(ctx.company.id);
  }

  /**
   * Invite a new member (or update an existing one).
   * The actual Clerk invitation is handled by the frontend via Clerk's
   * organization invitations — this just ensures we have the row ready.
   * Caller must have 'admin' or 'owner' role.
   */
  static async inviteMember(
    ctx: CompanyContext,
    input: InviteMemberInput,
    targetClerkUserId: string,
  ): Promise<CompanyUser> {
    const existing = await CompanyRepo.getMember(ctx.company.id, targetClerkUserId);
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "User is already a member of this company",
        409,
      );
    }
    return CompanyRepo.createMember(ctx.company.id, targetClerkUserId, input.role);
  }

  /**
   * Remove a member.
   * Cannot remove the owner or yourself.
   */
  static async removeMember(
    ctx: CompanyContext,
    targetClerkUserId: string,
  ): Promise<void> {
    if (targetClerkUserId === ctx.clerkUserId) {
      throw new AppError("BAD_REQUEST", "You cannot remove yourself", 400);
    }

    const member = await CompanyRepo.getMember(ctx.company.id, targetClerkUserId);
    if (!member) {
      throw new AppError("NOT_FOUND", "Member not found", 404);
    }
    if (member.role === "owner") {
      throw new AppError("FORBIDDEN", "Cannot remove the company owner", 403);
    }

    await CompanyRepo.removeMember(ctx.company.id, targetClerkUserId);
  }

  /**
   * Update a member's role.
   * Cannot change the owner role.
   */
  static async updateMemberRole(
    ctx: CompanyContext,
    targetClerkUserId: string,
    newRole: Exclude<import("@prisma/client").CompanyRole, "owner">,
  ): Promise<CompanyUser> {
    const member = await CompanyRepo.getMember(ctx.company.id, targetClerkUserId);
    if (!member) {
      throw new AppError("NOT_FOUND", "Member not found", 404);
    }
    if (member.role === "owner") {
      throw new AppError("FORBIDDEN", "Cannot change the owner's role", 403);
    }
    return CompanyRepo.updateMemberRole(ctx.company.id, targetClerkUserId, newRole);
  }
}
