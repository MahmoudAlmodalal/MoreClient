import { and, eq } from "drizzle-orm";
import { db, tenants, settings, type Tenant } from "./db";

export async function findTenantByKey(tenantKey: string): Promise<Tenant | undefined> {
  const [t] = await db.select().from(tenants).where(eq(tenants.tenantKey, tenantKey)).limit(1);
  return t;
}

export async function getSettings(tenantId: number) {
  const [s] = await db.select().from(settings).where(eq(settings.tenantId, tenantId)).limit(1);
  return s;
}

export async function ensureSettings(tenantId: number) {
  const existing = await getSettings(tenantId);
  if (existing) return existing;
  const [created] = await db.insert(settings).values({ tenantId }).returning();
  return created;
}

export function slugifyTenantKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || `tenant-${Date.now()}`
  );
}

// Used by admin tenant search to apply optional active toggle filtering.
export function tenantStatusFilter(status: string | undefined) {
  if (status === "active") return eq(tenants.status, "active");
  if (status === "inactive") return eq(tenants.status, "inactive");
  return undefined;
}

export function combineFilters(...filters: Array<ReturnType<typeof eq> | undefined>) {
  const list = filters.filter((f): f is ReturnType<typeof eq> => Boolean(f));
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return and(...list);
}
