import { listRoles, roleSkillGraph, readiness } from "@skillforge/db";
import { skills, studentSkills } from "@skillforge/db/schema";
import { query } from "@skillforge/service-kit";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";

export const taxonomy = new Hono<Vars>();

/** Skill slug to demonstrated level, for whoever is asking. Anonymous callers
 *  get an empty map and therefore an all-gaps graph, which is the right
 *  preview for a signed-out visitor. */
export async function demonstratedLevels(
  userId: string | null,
): Promise<Record<string, number>> {
  if (!userId) return {};
  const rows = await db
    .select({ slug: skills.slug, level: studentSkills.level })
    .from(studentSkills)
    .innerJoin(skills, eq(skills.id, studentSkills.skillId))
    .where(eq(studentSkills.userId, userId));
  return Object.fromEntries(rows.map((row) => [row.slug, row.level]));
}

/** The tree: categories, their subcategories, their leaves. */
taxonomy.get("/taxonomy", async (c) => {
  const rows = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      altitude: skills.altitude,
      parentId: skills.parentId,
      categoryId: skills.categoryId,
      description: skills.description,
    })
    .from(skills)
    .orderBy(asc(skills.name));

  const children = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = children.get(row.parentId) ?? [];
    list.push(row);
    children.set(row.parentId, list);
  }

  const categories = rows
    .filter((row) => row.altitude === "CATEGORY")
    .map((category) => ({
      ...category,
      subcategories: (children.get(category.id) ?? []).map((sub) => ({
        ...sub,
        skills: children.get(sub.id) ?? [],
      })),
    }));

  return c.json({ categories });
});

taxonomy.get("/roles", async (c) => c.json({ roles: await listRoles(db) }));

/**
 * The Skill Graph and the roadmap read the same thing: the role's required
 * subgraph plus transitive prerequisites, each node tagged with a mastery
 * state. One table, three views — this is the query behind two of them.
 */
taxonomy.get("/graph", async (c) => {
  const { role } = query(c, z.object({ role: z.string().min(1) }));
  const actor = c.get("identity");

  const graph = await roleSkillGraph(
    db,
    role,
    await demonstratedLevels(actor?.id ?? null),
  ).catch(() => {
    throw new HTTPException(404, { message: `No such role: ${role}` });
  });

  return c.json({ ...graph, readiness: readiness(graph.skills) });
});
