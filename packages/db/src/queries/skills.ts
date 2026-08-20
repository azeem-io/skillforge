import { asc, eq } from "drizzle-orm";

import type { Database } from "../client";
import {
  resources,
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

  // A prerequisite counts as a foundation at half the level the role asks of
  // it. Any evidence at all is too weak — NumPy at 1 of 4 is no basis for
  // starting Pandas — and the full level is too strict, since OOP at 3 of 4 is
  // plainly enough to start writing unit tests. Mirrored by
  // SkillGapCalculator.identify_gaps() in python-analyzer; change both.
  const foundation = new Set(
    rows
      .filter((r) => r.level >= Math.ceil(r.requiredLevel / 2))
      .map((r) => r.id),
  );
  for (const r of rows) {
    if (r.level >= r.requiredLevel) r.mastery = "mastered";
    else if (r.level > 0) r.mastery = "progress";
    else if (r.prerequisites.every((p) => foundation.has(p))) r.mastery = "gap";
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
  const todo = rows.filter(
    (r) => r.mastery === "gap" || r.mastery === "locked",
  );
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

export type TreeSkill = {
  id: string;
  slug: string;
  name: string;
  altitude: "CATEGORY" | "SUBCATEGORY" | "SKILL";
  description: string | null;
  // null when the role does not require this skill. The Skill Tree renders
  // those muted rather than inventing a fifth mastery state.
  mastery: Mastery | null;
  level: number;
  requiredLevel: number;
  weight: number;
  prerequisites: string[];
  unlocks: string[];
  resources: TreeResource[];
  children: TreeSkill[];
};

export type TreeResource = {
  title: string;
  url: string | null;
  type: string;
  provider: string | null;
};

/**
 * The whole taxonomy as a tree via parentId, with the role's mastery states
 * overlaid. States come from roleSkillGraph so the Tree, Graph and Roadmap
 * cannot disagree about what a skill's state is.
 */
export async function skillTree(
  db: Database,
  roleSlug: string,
  demonstrated: Record<string, number> = {},
): Promise<{
  role: { name: string; summary: string | null };
  categories: TreeSkill[];
}> {
  const { role, skills: required } = await roleSkillGraph(
    db,
    roleSlug,
    demonstrated,
  );
  const state = new Map(required.map((r) => [r.id, r]));

  const all = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      altitude: skills.altitude,
      parentId: skills.parentId,
      description: skills.description,
    })
    .from(skills)
    .orderBy(asc(skills.name));

  // The whole prerequisite graph, not just the role's closure — the detail
  // panel names a skill's prerequisites even when the goal does not need it.
  const edges = await db
    .select({
      skillId: skillPrerequisites.skillId,
      prerequisiteId: skillPrerequisites.prerequisiteId,
    })
    .from(skillPrerequisites);

  const needs = new Map<string, string[]>();
  const opens = new Map<string, string[]>();
  for (const e of edges) {
    if (!needs.has(e.skillId)) needs.set(e.skillId, []);
    needs.get(e.skillId)!.push(e.prerequisiteId);
    if (!opens.has(e.prerequisiteId)) opens.set(e.prerequisiteId, []);
    opens.get(e.prerequisiteId)!.push(e.skillId);
  }

  const resourceRows = await db
    .select({
      skillId: resources.skillId,
      title: resources.title,
      url: resources.url,
      type: resources.type,
      provider: resources.provider,
    })
    .from(resources)
    .orderBy(asc(resources.title));

  const learning = new Map<string, TreeResource[]>();
  for (const r of resourceRows) {
    if (!learning.has(r.skillId)) learning.set(r.skillId, []);
    learning.get(r.skillId)!.push({
      title: r.title,
      url: r.url,
      type: r.type,
      provider: r.provider,
    });
  }

  const nodes = new Map<string, TreeSkill>(
    all.map((s) => {
      const r = state.get(s.id);
      return [
        s.id,
        {
          id: s.id,
          slug: s.slug,
          name: s.name,
          altitude: s.altitude,
          description: s.description,
          mastery: r?.mastery ?? null,
          level: r?.level ?? demonstrated[s.slug] ?? 0,
          requiredLevel: r?.requiredLevel ?? 0,
          weight: r?.weight ?? 0,
          prerequisites: needs.get(s.id) ?? [],
          unlocks: opens.get(s.id) ?? [],
          resources: learning.get(s.id) ?? [],
          children: [],
        },
      ];
    }),
  );

  const categories: TreeSkill[] = [];
  for (const s of all) {
    const parent = s.parentId ? nodes.get(s.parentId) : undefined;
    if (parent) parent.children.push(nodes.get(s.id)!);
    else categories.push(nodes.get(s.id)!);
  }

  return { role: { name: role.name, summary: role.summary }, categories };
}
