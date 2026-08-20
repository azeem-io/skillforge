import { createDb } from "@skillforge/db";
import { mentorships } from "@skillforge/db/schema";
import { requireUser, type Identity, type IdentityVars } from "@skillforge/service-kit";
import { serviceEnv } from "@skillforge/service-kit";
import { and, eq } from "drizzle-orm";
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
 * A mentor's access is a join against `mentorships`, not a comparison against
 * the string "mentor": holding the role grants nothing on its own, only the
 * pairing does.
 */
export async function requireReadAccess(
  c: Context<Vars>,
  userId: string,
): Promise<Identity> {
  const actor = requireUser(c);
  if (actor.id === userId || actor.role === "admin") return actor;

  if (actor.role === "mentor") {
    const [pair] = await db
      .select({ mentorId: mentorships.mentorId })
      .from(mentorships)
      .where(
        and(eq(mentorships.mentorId, actor.id), eq(mentorships.studentId, userId)),
      )
      .limit(1);
    if (pair) return actor;
  }

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
