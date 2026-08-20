import { createDb, schema } from "@skillforge/db";
import { authEnv } from "@skillforge/service-kit";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { hashPassword, verifyPassword } from "./password";

export const env = authEnv(8081);

const db = createDb(env.databaseUrl);

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  // The browser reaches this service through the gateway, which mounts it
  // under the same prefix Better Auth defaults to, so no rewriting happens
  // anywhere along the path.
  basePath: "/api/auth",
  trustedOrigins: env.trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // Better Auth's models are singular (`user`, `session`); this maps them
    // onto our plural table names in one place.
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: true,
    // argon2id at the OWASP baseline. The hash lives in `accounts.password`;
    // there is no passwordHash column on users by design.
    password: { hash: hashPassword, verify: verifyPassword },
  },
  session: {
    // Database sessions, not JWTs: the gateway verifies against a live row, so
    // signing a student out actually signs them out.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    // Not the production-only default — on unconditionally, so a
    // misconfiguration surfaces in development too.
    enabled: true,
    window: 60,
    max: 60,
    storage: "database",
    // No `modelName` here — see the comment on `rateLimits` in
    // packages/db/src/schema/auth.ts for why setting one breaks resolution.
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
      "/sign-up/email": { window: 900, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.AUTH_INSECURE_COOKIES !== "true",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      // Behind Caddy and the gateway an attacker-supplied X-Forwarded-For plus
      // each hop's own append is a multi-hop chain; without naming the trusted
      // hops Better Auth returns no IP at all and every client collapses into
      // one shared rate-limit bucket.
      trustedProxies: (process.env.TRUSTED_PROXIES ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      ipv6Subnet: 64,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["student", "mentor", "admin"],
        required: false,
        defaultValue: "student",
        // Server-owned. Without this a crafted signup body could post
        // `role: "admin"` and escalate its own privileges.
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;
