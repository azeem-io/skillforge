import "server-only";

import { phases, readiness, roleSkillGraph } from "@skillforge/db";

import { db } from "./db";

export type { SkillRow } from "@skillforge/db";
export { phases, readiness };

export function roleGraph(
  roleSlug: string,
  demonstrated: Record<string, number> = {},
) {
  return roleSkillGraph(db(), roleSlug, demonstrated);
}
