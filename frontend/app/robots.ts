import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// SITE_URL is read from the environment at request time, so this cannot be
// baked into the build — a container built once and deployed to a domain
// would otherwise advertise localhost.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything below is one student's own data behind a session. A crawler
      // only ever gets the login redirect, but saying so saves the round trip.
      disallow: [
        "/api/",
        "/ai/",
        "/dashboard",
        "/assessments",
        "/graph",
        "/tree",
        "/roadmap",
        "/review",
        "/compare",
        "/profile",
        "/resources",
        "/students",
        "/assistant",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
