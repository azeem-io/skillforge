import "server-only";

import { analyzerPayload, phases, readiness } from "@skillforge/db";

import { db } from "./db";

export type { SkillRow, TreeSkill } from "@skillforge/db";
export { phases, readiness };

export function studentContext(
  demonstrated: Record<string, number>,
  targetRoleSlug?: string,
) {
  return analyzerPayload(db(), demonstrated, targetRoleSlug);
}
