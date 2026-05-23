import type { NextConfig } from "next";

// ─── Content Security Policy ──────────────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://clerk.moreclient.com https://*.clerk.accounts.dev",
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.sisko.replit.dev"],
  experimental: {},
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Public talent profiles: CDN-cacheable with 5-min TTL + 60s stale-while-revalidate
        source: "/t/:handle",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=60",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
