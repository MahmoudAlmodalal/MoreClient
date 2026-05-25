import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenants, authUsers, settings } from "../lib/db";
import { hashPassword, signJwt, verifyPassword } from "../lib/auth";
import { ensureDemoTenant, slugifyTenantKey } from "../lib/tenant";
import { requireJwt } from "../middlewares/auth";

const router: IRouter = Router();

function sessionFor(opts: {
  userId: number;
  email: string;
  name: string | null;
  role: "admin" | "company";
  tenantId: number;
  tenantKey: string;
}) {
  const token = signJwt({
    sub: opts.userId,
    tid: opts.tenantId,
    tk: opts.tenantKey,
    role: opts.role,
  });
  return {
    token,
    userId: opts.userId,
    email: opts.email,
    name: opts.name,
    role: opts.role,
    redirectTo: opts.role === "admin" ? "/admin" : "/dashboard",
    tenantKey: opts.tenantKey,
  };
}

router.post("/auth/register", async (req, res) => {
  const { name, email, password, companyName } = req.body ?? {};
  if (!email || !password || !companyName) {
    return res.status(400).json({ detail: "email, password, companyName are required" });
  }
  const existing = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing[0]) return res.status(409).json({ detail: "Email already registered" });

  const tenantKey = slugifyTenantKey(companyName);
  const [tenant] = await db
    .insert(tenants)
    .values({ tenantKey, name: companyName, email })
    .returning();
  await db.insert(settings).values({ tenantId: tenant.id, companyName });

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(authUsers)
    .values({ tenantId: tenant.id, email, passwordHash, name: name || null, role: "company" })
    .returning();

  return res.json(
    sessionFor({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "company",
      tenantId: tenant.id,
      tenantKey: tenant.tenantKey,
    }),
  );
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ detail: "email and password required" });
  const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (!user) return res.status(401).json({ detail: "Invalid credentials" });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ detail: "Invalid credentials" });
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
  return res.json(
    sessionFor({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "company",
      tenantId: user.tenantId,
      tenantKey: tenant?.tenantKey || "",
    }),
  );
});

router.post("/auth/demo-login", async (_req, res) => {
  const demo = await ensureDemoTenant();
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, "demo@clientmore.app"))
    .limit(1);
  if (!user) return res.status(500).json({ detail: "Demo bootstrap failed" });
  return res.json(
    sessionFor({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "company",
      tenantId: demo.id,
      tenantKey: demo.tenantKey,
    }),
  );
});

router.get("/auth/me", requireJwt, async (req, res) => {
  const [user] = await db.select().from(authUsers).where(eq(authUsers.id, req.auth!.sub)).limit(1);
  if (!user) return res.status(404).json({ detail: "User not found" });
  return res.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantKey: req.auth!.tk,
  });
});

// Refresh: accept a still-valid token and return a fresh one with a reset TTL.
// Works as both a sliding-session helper and a proactive renewal before expiry.
router.post("/auth/refresh", requireJwt, async (req, res) => {
  const auth = req.auth!;
  const [user] = await db.select().from(authUsers).where(eq(authUsers.id, auth.sub)).limit(1);
  if (!user) return res.status(404).json({ detail: "User not found" });
  const token = signJwt({ sub: auth.sub, tid: auth.tid, tk: auth.tk, role: auth.role });
  return res.json({ token });
});

router.post("/auth/logout", (_req, res) => {
  // Stateless JWT — clients clear local storage.
  res.json({ ok: true });
});

export default router;
