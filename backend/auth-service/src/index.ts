import { createDb } from "@skillforge/db";
import { users } from "@skillforge/db/schema";
import {
  health,
  identity,
  onError,
  notFound,
  requestLog,
  requireRole,
  type IdentityVars,
} from "@skillforge/service-kit";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { auth, env } from "./auth";

const SERVICE = "auth-service";

const db = createDb(env.databaseUrl);
const app = new Hono<IdentityVars>();

app.use("*", requestLog(SERVICE));
app.use("*", identity(env.gatewaySecret));
app.onError(onError(SERVICE));
app.notFound(notFound);

health(app, SERVICE);

/**
 * How the gateway turns a cookie into an identity. It exists so the shape of
 * a Better Auth session response is known in exactly one place; every other
 * service only ever sees the three forwarded headers.
 */
app.get("/internal/session", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ user: null }, 200);

  const user = session.user as { id: string; email: string; role?: string };
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      // Better Auth types `role` as optional because it is an additional
      // field; the column is NOT NULL with a default, so this is belt and
      // braces rather than a real branch.
      role: user.role ?? "student",
    },
  });
});

/**
 * Registered before the Better Auth catch-all below, which would otherwise
 * swallow them. Role changes are the one thing Better Auth's credential flow
 * deliberately cannot do — `input: false` on the field blocks self-assignment.
 */
const roles = new Hono<IdentityVars>();

roles.get("/users", async (c) => {
  requireRole(c, "admin");
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
  return c.json({ users: rows });
});

const RoleUpdate = z.object({ role: z.enum(["student", "mentor", "admin"]) });

roles.patch("/users/:id", async (c) => {
  const actor = requireRole(c, "admin");
  const id = c.req.param("id");

  // An admin demoting themselves can leave an installation with no admin at
  // all, and nothing else in the system can undo it.
  if (id === actor.id) {
    throw new HTTPException(400, { message: "Cannot change your own role" });
  }

  const parsed = RoleUpdate.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Expected { role }" });
  }

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role })
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) throw new HTTPException(404, { message: "No such user" });
  return c.json({ user: updated });
});

app.route("/api/auth/roles", roles);

// Better Auth owns everything else under the prefix: sign-up, sign-in,
// sign-out, get-session, and the rest of its surface.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

console.log(`[${SERVICE}] listening on :${env.port}`);

export default { port: env.port, fetch: app.fetch };
