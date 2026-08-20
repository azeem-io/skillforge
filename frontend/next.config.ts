import type { NextConfig } from "next";

const gateway = process.env.GATEWAY_URL;

const nextConfig: NextConfig = {
  // Ships a self-contained server plus only the node_modules it actually
  // imports, which is what keeps the runtime image small enough to matter on
  // the VPS. `outputFileTracingRoot` is required in a monorepo — without it
  // Next traces from frontend/ and leaves the workspace packages behind.
  output: "standalone",
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,

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
