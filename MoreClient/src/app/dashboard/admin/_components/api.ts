/**
 * Thin client-side fetch helpers for the admin API. Routes return RFC 7807
 * problem+json on error (`{ title, detail, status }`); we surface `detail`
 * (or `title`) as the thrown Error message.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    message = body?.detail || body?.title || message;
  } catch {
    /* non-json body */
  }
  throw new ApiError(message, res.status);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "DELETE" | "PATCH",
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

// ─── Shared response types ──────────────────────────────────────────────────

export type AdminTalent = {
  id: string;
  handle: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  country: string;
  status: "active" | "suspended" | "banned" | "paused";
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  planCode: string;
  featuredUntil: string | null;
  createdAt: string;
  payoutsEnabled: boolean;
  _count: { proposals: number; contracts: number };
};

export type TalentListResponse = {
  items: AdminTalent[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type PlatformMetric = {
  day: string;
  signupsTalent: number;
  signupsCompany: number;
  jobsPublished: number;
  proposalsSubmitted: number;
  contractsSigned: number;
  gmvCents: string; // BigInt serialized as string
  commissionCents: string;
  activeTalent: number;
  activeCompanies: number;
};

export type MetricsResponse = { items: PlatformMetric[]; days: number };

export type PlanCatalogItem = {
  code: string;
  principalType: "company" | "talent";
  nameEn: string;
  nameAr: string;
  monthlyCents: number;
  yearlyCents: number;
  features: unknown;
  active: boolean;
};

export type PlansResponse = { items: PlanCatalogItem[] };

export type Subscription = {
  principalType: "company" | "talent";
  principalId: string;
  stripeSubId: string;
  planCode: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
};

export type SubscriptionsResponse = {
  items: Subscription[];
  byPlan: { planCode: string; status: string; count: number }[];
  total: number;
};
