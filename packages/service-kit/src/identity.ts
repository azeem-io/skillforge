import { timingSafeEqual } from "node:crypto";

import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const USER_ROLES = ["student", "mentor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type Identity = {
  id: string;
  email: string;
  role: UserRole;
};

/**
 * Prefixed so nothing here can collide with a header a proxy sets for its own
 * reasons — `x-user-id` is common enough to arrive by accident.
 */
export const IDENTITY_HEADERS = {
  key: "x-skillforge-gateway-key",
  id: "x-skillforge-user-id",
  email: "x-skillforge-user-email",
  role: "x-skillforge-user-role",
} as const;

export type IdentityVars = { Variables: { identity: Identity | null } };

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Reads the identity the gateway asserted, having first proved the request
 * came from the gateway. An unsigned request is not rejected outright — health
 * checks and the taxonomy reads are public — it simply carries no identity,
 * and the `require*` helpers below turn that into a 401 where it matters.
 *
 * A request that presents a *wrong* key is rejected: that is a forgery
 * attempt, not an anonymous caller.
 */
export function identity(gatewaySecret: string): MiddlewareHandler<IdentityVars> {
  return async (c, next) => {
    const key = c.req.header(IDENTITY_HEADERS.key);
    if (key && !constantTimeEquals(key, gatewaySecret)) {
      throw new HTTPException(401, { message: "Invalid gateway key" });
    }

    const id = key ? c.req.header(IDENTITY_HEADERS.id) : undefined;
    const email = c.req.header(IDENTITY_HEADERS.email);
    const role = c.req.header(IDENTITY_HEADERS.role);

    c.set(
      "identity",
      id && email && role && isRole(role) ? { id, email, role } : null,
    );
    await next();
  };
}

export function requireUser(c: Context<IdentityVars>): Identity {
  const user = c.get("identity");
  if (!user) throw new HTTPException(401, { message: "Not signed in" });
  return user;
}

export function requireRole(
  c: Context<IdentityVars>,
  ...roles: UserRole[]
): Identity {
  const user = requireUser(c);
  if (!roles.includes(user.role)) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return user;
}

/**
 * The rule from CLAUDE.md, in one place: a student reads and writes their own
 * rows; an admin reads anyone's. A mentor is deliberately *not* covered here —
 * mentor access is a join against `mentorships`, which needs the database, so
 * it lives in the service that owns the table.
 */
export function requireSelf(c: Context<IdentityVars>, userId: string): Identity {
  const user = requireUser(c);
  if (user.id !== userId && user.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return user;
}
