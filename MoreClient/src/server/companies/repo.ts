import { prisma } from "../core/db";
import { generateId } from "../core/ids";
import type { Company, CompanyUser, Prisma, CompanyRole } from "@prisma/client";
import type { CreateCompanyInput, UpdateCompanyInput } from "@/schemas/company";

export class CompanyRepo {
  /** Find a company by its Clerk org id. */
  static async findByClerkOrg(clerkOrgId: string): Promise<Company | null> {
    return prisma.company.findFirst({ where: { clerkOrgId, deletedAt: null } });
  }

  /** Find a company by its internal UUID. */
  static async findById(id: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { id, deletedAt: null } });
  }

  /** Find a company by slug. */
  static async findBySlug(slug: string): Promise<Company | null> {
    return prisma.company.findFirst({ where: { slug, deletedAt: null } });
  }

  /** Create a new company row. */
  static async create(
    clerkOrgId: string,
    input: CreateCompanyInput,
  ): Promise<Company> {
    return prisma.company.create({
      data: {
        id: generateId(),
        clerkOrgId,
        name: input.name,
        slug: input.slug,
        country: input.country,
        locale: input.locale ?? "en",
        legalName: input.legalName,
        websiteUrl: input.websiteUrl,
        logoUrl: input.logoUrl,
      },
    });
  }

  /** Update company profile fields. */
  static async update(
    id: string,
    data: UpdateCompanyInput,
  ): Promise<Company> {
    return prisma.company.update({ where: { id }, data });
  }

  /** Soft-delete a company. */
  static async softDelete(id: string): Promise<void> {
    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  /** Get all members of a company. */
  static async getMembers(companyId: string): Promise<CompanyUser[]> {
    return prisma.companyUser.findMany({ where: { companyId } });
  }

  /** Find a specific member. */
  static async getMember(
    companyId: string,
    clerkUserId: string,
  ): Promise<CompanyUser | null> {
    return prisma.companyUser.findUnique({
      where: { companyId_clerkUserId: { companyId, clerkUserId } },
    });
  }

  /** Create a new company member (upsert-safe). */
  static async createMember(
    companyId: string,
    clerkUserId: string,
    role: CompanyRole,
  ): Promise<CompanyUser> {
    return prisma.companyUser.upsert({
      where: { companyId_clerkUserId: { companyId, clerkUserId } },
      create: { companyId, clerkUserId, role, joinedAt: new Date() },
      update: { role },
    });
  }

  /** Update a member's role. */
  static async updateMemberRole(
    companyId: string,
    clerkUserId: string,
    role: CompanyRole,
  ): Promise<CompanyUser> {
    return prisma.companyUser.update({
      where: { companyId_clerkUserId: { companyId, clerkUserId } },
      data: { role },
    });
  }

  /** Remove a member from the company. */
  static async removeMember(companyId: string, clerkUserId: string): Promise<void> {
    await prisma.companyUser.delete({
      where: { companyId_clerkUserId: { companyId, clerkUserId } },
    });
  }
}
