import type { NextConfig } from "next";

// Baseline security headers for every route. A full Content-Security-Policy
// is planned for the hardening phase (docs/IMPLEMENTATION_PLAN.md, Phase 7).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Playwright builds into its own folder so it never disturbs a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    agentFeedback: true,
  },
  images: {
    // Service images uploaded to Neon object storage (server/storage.ts).
    remotePatterns: [{ protocol: "https", hostname: "**.storage.c-15.us-east-1.aws.neon.tech", pathname: "/site-images/services/**" }],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
