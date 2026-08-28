import type { NextConfig } from "next";

const gateway = process.env.GATEWAY_URL;

/**
 * Set here rather than at the edge. The Caddyfile carries a subset of these,
 * but Caddy is behind the opt-in `edge` compose profile — in production
 * Coolify's own proxy terminates TLS and Caddy never runs, so headers set
 * there reach nobody. Set on the app, they travel with it under any proxy.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Only the framing directive. A full policy would have to allow the
  // pre-paint theme script inline, and getting that wrong blanks the page —
  // this is the part that is safe to set without a nonce pipeline.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Ships a self-contained server plus only the node_modules it actually
  // imports, which is what keeps the runtime image small enough to matter on
  // the VPS. `outputFileTracingRoot` is required in a monorepo — without it
  // Next traces from frontend/ and leaves the workspace packages behind.
  output: "standalone",
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  async rewrites() {
    // Local dev only. In compose, Caddy splits /api/* to the gateway before a
    // request ever reaches Next; this is what makes `bun run dev` behave the
    // same way without running Caddy. Same-origin either way, which is what
    // lets the session cookie work without SameSite=None.
    if (!gateway) return [];
    return [{ source: "/api/:path*", destination: `${gateway}/api/:path*` }];
  },
};

export default nextConfig;
