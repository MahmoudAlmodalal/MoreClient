import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.sisko.replit.dev"],
  experimental: {},
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
