import { and, eq } from "drizzle-orm";
import { db, tenants, settings, type Tenant } from "./db";
import { hashPassword } from "./auth";
import { authUsers } from "./db";

let demoBootstrap: Promise<Tenant> | null = null;

// Guarantee a "demo" tenant exists for the public demo-login flow.
export async function ensureDemoTenant(): Promise<Tenant> {
  if (!demoBootstrap) {
    demoBootstrap = (async () => {
      const existing = await db.select().from(tenants).where(eq(tenants.tenantKey, "demo")).limit(1);
      if (existing[0]) return existing[0];
      const [created] = await db
        .insert(tenants)
        .values({ tenantKey: "demo", name: "Demo Company", email: "demo@clientmore.app" })
        .returning();
      await db.insert(settings).values({ tenantId: created.id, companyName: "Demo Company" });
      // Seed a demo operator account so /api/auth/me has a user backing the demo JWT.
      await db
        .insert(authUsers)
        .values({
          tenantId: created.id,
          email: "demo@clientmore.app",
          passwordHash: await hashPassword("demo-only"),
          name: "Demo Operator",
          role: "company",
        })
        .onConflictDoNothing();
      return created;
    })();
  }
  return demoBootstrap;
}

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
