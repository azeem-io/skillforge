import { resources, resourceType, skills, users } from "@skillforge/db/schema";
import { body, query, requireRole, requireUser } from "@skillforge/service-kit";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";

export const resourceRoutes = new Hono<Vars>();

/**
 * The library behind the Skill Tree's Resources section and the roadmap's
 * per-phase reading. Seeded rows carry no author; anything a mentor or an
 * admin adds carries theirs, which is what `seeded` distinguishes.
 */
function readResources(where?: SQL, limit = 500) {
  return db
    .select({
      id: resources.id,
      title: resources.title,
      url: resources.url,
      type: resources.type,
      provider: resources.provider,
      summary: resources.summary,
      createdAt: resources.createdAt,
      authorId: resources.createdBy,
      authorName: users.name,
      authorEmail: users.email,
      skillSlug: skills.slug,
      skillName: skills.name,
    })
    .from(resources)
    .innerJoin(skills, eq(skills.id, resources.skillId))
    .leftJoin(users, eq(users.id, resources.createdBy))
    .where(where)
    .orderBy(desc(resources.createdAt))
    .limit(limit);
}

type Row = Awaited<ReturnType<typeof readResources>>[number];

function shape(row: Row) {
  const { authorId, authorName, authorEmail, ...rest } = row;
  return {
    ...rest,
    seeded: authorId === null,
    author: authorId ? { id: authorId, name: authorName, email: authorEmail } : null,
  };
}

resourceRoutes.get("/resources", async (c) => {
  requireUser(c);
  const { skill } = query(c, z.object({ skill: z.string().min(1).optional() }));
  const rows = await readResources(skill ? eq(skills.slug, skill) : undefined);
  return c.json({ resources: rows.map(shape) });
});

const ResourceInput = z.object({
  skillSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  // The enum is the column's, so adding a type to the schema adds it here.
  type: z.enum(resourceType.enumValues),
  url: z.url().nullable().optional(),
  provider: z.string().max(120).nullable().optional(),
  summary: z.string().max(1000).nullable().optional(),
});

/** Mentors and admins curate the library; students only read it. */
resourceRoutes.post("/resources", async (c) => {
  const actor = requireRole(c, "mentor", "admin");
  const input = await body(c, ResourceInput);

  const [skill] = await db
    .select({ id: skills.id, altitude: skills.altitude })
    .from(skills)
    .where(eq(skills.slug, input.skillSlug));

  if (!skill) {
    throw new HTTPException(404, { message: `No such skill: ${input.skillSlug}` });
  }
  // Only leaves have a detail panel to render this in, and only leaves appear
  // in a roadmap phase.
  if (skill.altitude !== "SKILL") {
    throw new HTTPException(409, {
      message: "Attach a resource to a skill, not to a category or subcategory.",
    });
  }

  const [duplicate] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(
      and(
        eq(resources.skillId, skill.id),
        sql`lower(${resources.title}) = lower(${input.title})`,
      ),
    );
  if (duplicate) {
    throw new HTTPException(409, {
      message: "That skill already has a resource with this title.",
    });
  }

  const [created] = await db
    .insert(resources)
    .values({
      skillId: skill.id,
      title: input.title,
      url: input.url ?? null,
      type: input.type,
      provider: input.provider ?? null,
      summary: input.summary ?? null,
      createdBy: actor.id,
    })
    .returning({ id: resources.id });

  const [row] = await readResources(eq(resources.id, created!.id));
  return c.json({ resource: shape(row!) }, 201);
});

resourceRoutes.delete("/resources/:id", async (c) => {
  const actor = requireRole(c, "mentor", "admin");
  const id = z.uuid().safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "No such resource" });

  const [row] = await db
    .select({ id: resources.id, createdBy: resources.createdBy })
    .from(resources)
    .where(eq(resources.id, id.data));

  if (!row) throw new HTTPException(404, { message: "No such resource" });
  // Seeded rows have no author, so removing one is an admin decision about the
  // shared taxonomy rather than a mentor tidying up after themselves.
  if (actor.role !== "admin" && row.createdBy !== actor.id) {
    throw new HTTPException(403, {
      message: "Mentors can only remove resources they added.",
    });
  }

  await db.delete(resources).where(eq(resources.id, row.id));
  return c.json({ removed: true });
});
