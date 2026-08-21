import "server-only";

import {
  analyzerPayload,
  listRoles,
  phases,
  readiness,
  roleSkillGraph,
  skillTree,
} from "@skillforge/db";

import { db } from "./db";

export type { SkillRow, TreeSkill } from "@skillforge/db";
export { phases, readiness };

export function roles() {
  return listRoles(db());
}

export function studentContext(
  demonstrated: Record<string, number>,
  targetRoleSlug?: string,
) {
  return analyzerPayload(db(), demonstrated, targetRoleSlug);
}

export function roleGraph(
  roleSlug: string,
  demonstrated: Record<string, number> = {},
) {
  return roleSkillGraph(db(), roleSlug, demonstrated);
}

export function tree(
  roleSlug: string,
  demonstrated: Record<string, number> = {},
) {
  return skillTree(db(), roleSlug, demonstrated);
}
