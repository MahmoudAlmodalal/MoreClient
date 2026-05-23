import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Nonce-based CSP ─────────────────────────────────────────────────────────

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Build the CSP header.
 *
 * - On dynamic (authenticated) routes we pass a per-request `nonce` and use
 *   `'strict-dynamic'` with NO `'unsafe-inline'` — a genuinely strict policy.
 *   The nonce must be propagated to the request headers (see `cspResponse`) so
 *   Next.js applies it to its own scripts; otherwise strict-dynamic blocks them.
 * - On public, CDN-cacheable routes (`/t/[handle]`, marketing) we cannot use a
 *   per-request nonce: a cached HTML page would carry a stale nonce that no
 *   longer matches the response CSP. There we fall back to a static
 *   `'unsafe-inline'` script policy so the page stays cacheable.
 */
function buildCsp(nonce: string | null): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = nonce
    ? [
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        isDev ? "'unsafe-eval'" : "",
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        "https://clerk.moreclient.com",
        "https://*.clerk.accounts.dev",
        isDev ? "'unsafe-eval'" : "",
      ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.filter(Boolean).join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.r2.cloudflarestorage.com https://img.clerk.com",
    "font-src 'self'",
    [
      "connect-src 'self'",
      "https://inn.gs",
      "https://api.inngest.com",
      "wss://*.pusher.com https://*.pusher.com",
      "https://api.pinecone.io",
      "https://api.stripe.com",
      "https://clerk.moreclient.com",
      "https://*.clerk.accounts.dev",
      "https://*.upstash.io",
    ].join(" "),
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Produce the response with the appropriate CSP. For dynamic routes the nonce
 * is written to BOTH the forwarded request headers (so Next.js nonces its
 * scripts) and the response header. Public routes get a static, cacheable CSP.
 */
function cspResponse(request: NextRequest, useNonce: boolean): NextResponse {
  if (useNonce) {
    const nonce = generateNonce();
    const csp = buildCsp(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildCsp(null));
  return response;
}

// ─── Route matching ───────────────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/",
  "/welcome",
  "/t/(.*)",
  "/for-companies(.*)",
  "/for-talent(.*)",
  "/pricing(.*)",
  "/blog(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/healthz",
  "/api/readyz",
  "/api/webhooks/(.*)",
  "/api/inngest",
  "/api/v1/profiles/(.*)",
]);

const hasClerkConfig = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const authProxy = hasClerkConfig
  ? clerkMiddleware(async (auth, request) => {
      const isPublic = isPublicRoute(request);
      if (!isPublic) {
        await auth.protect();
      }
      // Public routes stay CDN-cacheable (static CSP); protected routes get a
      // strict per-request nonce CSP.
      return cspResponse(request, !isPublic);
    })
  : (request: NextRequest) => cspResponse(request, !isPublicRoute(request));

export const proxy = authProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
