import type { CompanyRole, AdminRole } from "@prisma/client";

// ─── Company Role Permissions ─────────────────────────────────────────────────

type Permission =
  | "jobs:create"
  | "jobs:read"
  | "jobs:update"
  | "jobs:delete"
  | "proposals:read"
  | "proposals:decide"
  | "contracts:create"
  | "contracts:read"
  | "contracts:update"
  | "messaging:read"
  | "messaging:write"
  | "billing:read"
  | "billing:write"
  | "members:create"
  | "members:read"
  | "members:update"
  | "members:delete"
  | "settings:read"
  | "settings:write";

const companyRolePermissions: Record<CompanyRole, Set<Permission>> = {
  owner: new Set([
    "jobs:create", "jobs:read", "jobs:update", "jobs:delete",
    "proposals:read", "proposals:decide",
    "contracts:create", "contracts:read", "contracts:update",
    "messaging:read", "messaging:write",
    "billing:read", "billing:write",
    "members:create", "members:read", "members:update", "members:delete",
    "settings:read", "settings:write",
  ]),
  admin: new Set([
    "jobs:create", "jobs:read", "jobs:update", "jobs:delete",
    "proposals:read", "proposals:decide",
    "contracts:create", "contracts:read", "contracts:update",
    "messaging:read", "messaging:write",
    "billing:read",
    "members:create", "members:read", "members:update", "members:delete",
    "settings:read", "settings:write",
  ]),
  recruiter: new Set([
    "jobs:create", "jobs:read", "jobs:update",
    "proposals:read", "proposals:decide",
    "contracts:read",
    "messaging:read", "messaging:write",
    "settings:read",
  ]),
  viewer: new Set([
    "jobs:read",
    "proposals:read",
    "contracts:read",
    "messaging:read",
    "settings:read",
  ]),
};

// ─── Admin Role Permissions ───────────────────────────────────────────────────

type AdminPermission =
  | "admin:companies:read"
  | "admin:companies:write"
  | "admin:talent:read"
  | "admin:talent:write"
  | "admin:moderation:read"
  | "admin:moderation:write"
  | "admin:subscriptions:read"
  | "admin:subscriptions:write"
  | "admin:flags:read"
  | "admin:flags:write"
  | "admin:admins:read"
  | "admin:admins:write";

const adminRolePermissions: Record<AdminRole, Set<AdminPermission>> = {
  super_admin: new Set([
    "admin:companies:read", "admin:companies:write",
    "admin:talent:read", "admin:talent:write",
    "admin:moderation:read", "admin:moderation:write",
    "admin:subscriptions:read", "admin:subscriptions:write",
    "admin:flags:read", "admin:flags:write",
    "admin:admins:read", "admin:admins:write",
  ]),
  admin: new Set([
    "admin:companies:read", "admin:companies:write",
    "admin:talent:read", "admin:talent:write",
    "admin:moderation:read", "admin:moderation:write",
    "admin:subscriptions:read",
    "admin:flags:read",
    "admin:admins:read",
  ]),
  moderator: new Set([
    "admin:companies:read",
    "admin:talent:read", "admin:talent:write",
    "admin:moderation:read", "admin:moderation:write",
  ]),
  support: new Set([
    "admin:companies:read",
    "admin:talent:read",
    "admin:moderation:read",
    "admin:subscriptions:read",
  ]),
};

export function hasCompanyPermission(role: CompanyRole, permission: Permission): boolean {
  return companyRolePermissions[role]?.has(permission) ?? false;
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return adminRolePermissions[role]?.has(permission) ?? false;
}

/** Returns true if roleA has at least the same permissions as roleB (roleA >= roleB). */
export function companyRoleAtLeast(role: CompanyRole, minRole: CompanyRole): boolean {
  const order: CompanyRole[] = ["viewer", "recruiter", "admin", "owner"];
  return order.indexOf(role) >= order.indexOf(minRole);
}

export function adminRoleAtLeast(role: AdminRole, minRole: AdminRole): boolean {
  const order: AdminRole[] = ["support", "moderator", "admin", "super_admin"];
  return order.indexOf(role) >= order.indexOf(minRole);
}
