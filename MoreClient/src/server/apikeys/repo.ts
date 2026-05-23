import { prisma } from "@/server/core/db";
import { generateId } from "@/server/core/ids";
import type { ApiKey, PrincipalType } from "@prisma/client";

export class ApiKeyRepo {
  static async create(input: {
    principalType: PrincipalType;
    principalId: string;
    keyPrefix: string;
    keyHash: string;
    name: string;
  }): Promise<ApiKey> {
    return prisma.apiKey.create({
      data: {
        id: generateId(),
        principalType: input.principalType,
        principalId: input.principalId,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        name: input.name,
      },
    });
  }

  static async listForPrincipal(principalType: PrincipalType, principalId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { principalType, principalId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string): Promise<ApiKey | null> {
    return prisma.apiKey.findUnique({ where: { id } });
  }

  /** Active (non-revoked) keys sharing a prefix — used to resolve a bearer token. */
  static async findActiveByPrefix(keyPrefix: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({ where: { keyPrefix, revokedAt: null } });
  }

  static async revoke(id: string): Promise<void> {
    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  static async touchLastUsed(id: string): Promise<void> {
    await prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
}
