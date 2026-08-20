import { asc, eq } from "drizzle-orm";

import type { Database } from "../client";
import {
  roleRequirements,
  skillPrerequisites,
  skills,
  targetRoles,
} from "../schema/index";

export type Mastery = "mastered" | "progress" | "gap" | "locked";

export type SkillRow = {
  id: string;
  slug: string;
  name: string;
  subcategory: string;
  category: string;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  weight: number;
  prerequisites: string[];
};

export function listRoles(db: Database) {
  return db
    .select({
      id: targetRoles.id,
      slug: targetRoles.slug,
      name: targetRoles.name,
      summary: targetRoles.summary,
    })
    .from(targetRoles)
    .orderBy(asc(targetRoles.name));
}

/**
 * Everything a role requires plus the transitive prerequisites, each tagged
 * with a mastery state. `demonstrated` maps skill slug to level 1-5 and stands
 * in for studentSkills until profile-api can supply it.
 */
export async function roleSkillGraph(
  db: Database,
  roleSlug: string,
  demonstrated: Record<string, number> = {},
): Promise<{
  role: { name: string; summary: string | null };
  skills: SkillRow[];
}> {
  const [role] = await db
    .select({
      id: targetRoles.id,
      name: targetRoles.name,
      summary: targetRoles.summary,
    })
    .from(targetRoles)
    .where(eq(targetRoles.slug, roleSlug));

  if (!role) throw new Error(`unknown role: ${roleSlug}`);

  const all = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      parentId: skills.parentId,
      categoryId: skills.categoryId,
    })
    .from(skills);

  const byId = new Map(all.map((s) => [s.id, s]));

  const edges = await db
    .select({
      skillId: skillPrerequisites.skillId,
      prerequisiteId: skillPrerequisites.prerequisiteId,
    })
    .from(skillPrerequisites);

  const prereqs = new Map<string, string[]>();
  for (const e of edges) {
    if (!prereqs.has(e.skillId)) prereqs.set(e.skillId, []);
    prereqs.get(e.skillId)!.push(e.prerequisiteId);
  }

  const reqs = await db
    .select({
      skillId: roleRequirements.skillId,
      requiredLevel: roleRequirements.requiredLevel,
      weight: roleRequirements.weight,
    })
    .from(roleRequirements)
    .where(eq(roleRequirements.roleId, role.id));

  const required = new Map(reqs.map((r) => [r.skillId, r]));

  const closure = new Set<string>();
  const walk = (id: string) => {
    if (closure.has(id)) return;
    closure.add(id);
    (prereqs.get(id) ?? []).forEach(walk);
  };
  reqs.forEach((r) => walk(r.skillId));

  const rows: SkillRow[] = [...closure].map((id) => {
    const s = byId.get(id)!;
    const req = required.get(id);
    return {
      id,
      slug: s.slug,
      name: s.name,
      subcategory: byId.get(s.parentId ?? "")?.name ?? "",
      category: byId.get(s.categoryId ?? "")?.name ?? "",
      mastery: "gap",
      level: demonstrated[s.slug] ?? 0,
      requiredLevel: req?.requiredLevel ?? 2,
      weight: req?.weight ?? 3,
      prerequisites: (prereqs.get(id) ?? []).filter((p) => closure.has(p)),
    };
  });

  const met = new Set(
    rows.filter((r) => r.level >= r.requiredLevel).map((r) => r.id),
  );
  for (const r of rows) {
    if (r.level >= r.requiredLevel) r.mastery = "mastered";
    else if (r.level > 0) r.mastery = "progress";
    else if (r.prerequisites.every((p) => met.has(p))) r.mastery = "gap";
    else r.mastery = "locked";
  }

  return { role: { name: role.name, summary: role.summary }, skills: rows };
}

export function readiness(rows: SkillRow[]): number {
  const earned = rows.reduce(
    (a, r) => a + Math.min(r.level, r.requiredLevel) * r.weight,
    0,
  );
  const total = rows.reduce((a, r) => a + r.requiredLevel * r.weight, 0);
  return total ? Math.round((earned / total) * 100) : 0;
}

/** Longest-path layering. Moves to RoadmapGenerator once python-analyzer lands. */
export function phases(rows: SkillRow[]): SkillRow[][] {
  const todo = rows.filter((r) => r.mastery === "gap" || r.mastery === "locked");
  const inSet = new Set(todo.map((r) => r.id));
  const byId = new Map(todo.map((r) => [r.id, r]));
  const depth = new Map<string, number>();

  const rank = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const ps = (byId.get(id)?.prerequisites ?? []).filter((p) => inSet.has(p));
    const d = ps.length ? Math.max(...ps.map(rank)) + 1 : 0;
    depth.set(id, d);
    return d;
  };
  todo.forEach((r) => rank(r.id));

  const out: SkillRow[][] = [];
  for (const r of todo) (out[depth.get(r.id)!] ??= []).push(r);
  return out.filter(Boolean);
}
