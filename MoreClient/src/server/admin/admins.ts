import { prisma } from "@/server/core/db";
import { AppError } from "@/server/core/errors";
import { generateId } from "@/server/core/ids";
import { writeAudit } from "@/server/audit/index";
import type { PlatformAdmin } from "@prisma/client";
import type { AuditContext } from "@/server/audit/index";
import { z } from "zod";

export const createAdminSchema = z.object({
  clerkUserId: z.string().min(1),
  role: z.enum(["super_admin", "admin", "moderator", "support"]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export async function listAdmins(): Promise<PlatformAdmin[]> {
  return prisma.platformAdmin.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createAdmin(
  input: CreateAdminInput,
  auditCtx: AuditContext,
): Promise<PlatformAdmin> {
  const existing = await prisma.platformAdmin.findUnique({
    where: { clerkUserId: input.clerkUserId },
  });
  if (existing) {
    throw new AppError("CONFLICT", "Admin with this Clerk user ID already exists", 409);
  }

  const admin = await prisma.platformAdmin.create({
    data: {
      id: generateId(),
      clerkUserId: input.clerkUserId,
      role: input.role,
      active: true,
      createdBy: auditCtx.actorId,
    },
  });

  await writeAudit(auditCtx, "admin.created", "platform_admin", admin.id, { role: input.role });
  return admin;
}

export async function deactivateAdmin(
  adminId: string,
  auditCtx: AuditContext,
): Promise<PlatformAdmin> {
  const admin = await prisma.platformAdmin.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("NOT_FOUND", "Admin not found", 404);

  const updated = await prisma.platformAdmin.update({
    where: { id: adminId },
    data: { active: false },
  });

  await writeAudit(auditCtx, "admin.deactivated", "platform_admin", adminId);
  return updated;
}
