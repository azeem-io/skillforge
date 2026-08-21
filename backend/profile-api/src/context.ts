import { canReadStudent, createDb } from "@skillforge/db";
import { requireUser, type Identity, type IdentityVars } from "@skillforge/service-kit";
import { serviceEnv } from "@skillforge/service-kit";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const env = {
  ...serviceEnv("profile-api", 8082),
  uploadDir: z
    .string()
    .min(1)
    .catch(`${process.env.TMPDIR ?? "/tmp"}/skillforge-uploads`)
    // Deliberately outside the repo even as a fallback: "never into the repo"
    // is exactly the rule a repo-relative default gets someone to break.
    .parse(process.env.UPLOAD_DIR),
};

export const db = createDb(env.databaseUrl);

export type Vars = IdentityVars;

/**
 * Authorization re-checked at the data layer, per CLAUDE.md — the gateway
 * proves *who* is calling and nothing more.
 *
 * The rule itself is `canReadStudent` in packages/db, because skill-service
 * enforces the same one over a student's attempts.
 */
export async function requireReadAccess(
  c: Context<Vars>,
  userId: string,
): Promise<Identity> {
  const actor = requireUser(c);
  if (await canReadStudent(db, actor, userId)) return actor;
  throw new HTTPException(403, { message: "Forbidden" });
}

/** Writes are narrower than reads: a mentor may look, never edit. */
export function requireWriteAccess(c: Context<Vars>, userId: string): Identity {
  const actor = requireUser(c);
  if (actor.id !== userId && actor.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return actor;
}
