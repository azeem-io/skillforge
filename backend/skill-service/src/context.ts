import { canReadStudent, createDb } from "@skillforge/db";
import {
  requireUser,
  serviceEnv,
  type Identity,
  type IdentityVars,
} from "@skillforge/service-kit";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const env = {
  ...serviceEnv("skill-service", 8083),
  // Optional: the roadmap falls back to a local layering when it is unset or
  // unreachable. See src/roadmap.ts.
  pythonAnalyzerUrl: process.env.PYTHON_ANALYZER_URL ?? "",
  // Also optional, and for prose only: unset means a roadmap with null
  // narration, never a roadmap with a different shape. See src/narrator.ts.
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "",
};

export const db = createDb(env.databaseUrl);

export type Vars = IdentityVars;

/**
 * The same rule profile-api enforces over a student's profile, enforced here
 * over their attempts: a mentor reads a student only when a `mentorships` row
 * joins them, and an admin reads anyone. Re-checked at the data layer, never
 * taken on trust from the gateway.
 */
export async function requireReadAccess(
  c: Context<Vars>,
  userId: string,
): Promise<Identity> {
  const actor = requireUser(c);
  if (await canReadStudent(db, actor, userId)) return actor;
  throw new HTTPException(403, { message: "Forbidden" });
}
