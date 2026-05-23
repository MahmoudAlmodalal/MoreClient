import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
]);

const hasClerkConfig = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// When Clerk is not configured (local dev without keys), pass all requests through.
// Once NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set, full auth enforcement activates.
const authProxy = hasClerkConfig
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : (_request: NextRequest) => NextResponse.next();

export const proxy = authProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
