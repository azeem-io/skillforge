import { aliasedTable, eq } from "drizzle-orm";

import type { Database } from "../client";
import {
  roleRequirements,
  skillPrerequisites,
  skills,
  targetRoles,
} from "../schema/skills";

/**
 * The taxonomy in the shape python-analyzer accepts: slugs rather than ids,
 * every role carrying its own requirements so a single call can rank them.
 */
export async function analyzerPayload(
  db: Database,
  demonstrated: Record<string, number> = {},
  targetRoleSlug?: string,
) {
  const prereq = aliasedTable(skills, "prereq");

  const [leaves, edges, requirements, roles] = await Promise.all([
    db
      .select({ slug: skills.slug, name: skills.name })
      .from(skills)
      .where(eq(skills.altitude, "SKILL")),
    db
      .select({ skill: skills.slug, prerequisite: prereq.slug })
      .from(skillPrerequisites)
      .innerJoin(skills, eq(skills.id, skillPrerequisites.skillId))
      .innerJoin(prereq, eq(prereq.id, skillPrerequisites.prerequisiteId)),
    db
      .select({
        roleSlug: targetRoles.slug,
        skill: skills.slug,
        required_level: roleRequirements.requiredLevel,
        weight: roleRequirements.weight,
      })
      .from(roleRequirements)
      .innerJoin(targetRoles, eq(targetRoles.id, roleRequirements.roleId))
      .innerJoin(skills, eq(skills.id, roleRequirements.skillId)),
    db
      .select({ slug: targetRoles.slug, name: targetRoles.name })
      .from(targetRoles),
  ]);

  const byRole = new Map<string, { skill: string; required_level: number; weight: number }[]>();
  for (const r of requirements) {
    if (!byRole.has(r.roleSlug)) byRole.set(r.roleSlug, []);
    byRole.get(r.roleSlug)!.push({
      skill: r.skill,
      required_level: r.required_level,
      weight: r.weight,
    });
  }

  return {
    skills: leaves,
    edges,
    demonstrated,
    target_role: targetRoleSlug ?? null,
    requirements: targetRoleSlug ? (byRole.get(targetRoleSlug) ?? []) : [],
    roles: roles.map((r) => ({
      slug: r.slug,
      name: r.name,
      requirements: byRole.get(r.slug) ?? [],
    })),
  };
}
