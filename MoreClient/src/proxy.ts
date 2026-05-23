import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Nonce-based CSP ─────────────────────────────────────────────────────────

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'unsafe-inline'",
    "https://clerk.moreclient.com",
    "https://*.clerk.accounts.dev",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
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

function withCsp(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// ─── Route matching ───────────────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/",
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
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
      const response = NextResponse.next();
      return withCsp(request, response);
    })
  : (request: NextRequest) => withCsp(request, NextResponse.next());

export const proxy = authProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
