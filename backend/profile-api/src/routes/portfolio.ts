import {
  certifications,
  projects,
  projectSkills,
  skills,
} from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";

export const portfolio = new Hono<Vars>();

async function readProjects(userId: string) {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      url: projects.url,
      startedAt: projects.startedAt,
      completedAt: projects.completedAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));

  if (rows.length === 0) return [];

  // One query for every project's skills rather than one per project — the
  // profile page renders the whole list at once.
  const tags = await db
    .select({
      projectId: projectSkills.projectId,
      slug: skills.slug,
      name: skills.name,
    })
    .from(projectSkills)
    .innerJoin(skills, eq(skills.id, projectSkills.skillId))
    .where(
      inArray(
        projectSkills.projectId,
        rows.map((row) => row.id),
      ),
    );

  const byProject = new Map<string, { slug: string; name: string }[]>();
  for (const tag of tags) {
    const list = byProject.get(tag.projectId) ?? [];
    list.push({ slug: tag.slug, name: tag.name });
    byProject.set(tag.projectId, list);
  }

  return rows.map((row) => ({ ...row, skills: byProject.get(row.id) ?? [] }));
}

const ProjectInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  url: z.url().nullable().optional(),
  startedAt: z.iso.datetime().nullable().optional(),
  completedAt: z.iso.datetime().nullable().optional(),
  skillSlugs: z.array(z.string().min(1)).max(30).optional(),
});

async function resolveSkillIds(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select({ id: skills.id, slug: skills.slug })
    .from(skills)
    .where(inArray(skills.slug, slugs));
  const found = new Set(rows.map((row) => row.slug));
  const missing = slugs.filter((slug) => !found.has(slug));
  if (missing.length) {
    throw new HTTPException(400, { message: `Unknown skills: ${missing.join(", ")}` });
  }
  return rows.map((row) => row.id);
}

portfolio.get("/projects", async (c) => {
  const actor = requireUser(c);
  return c.json({ projects: await readProjects(actor.id) });
});

portfolio.post("/projects", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, ProjectInput);
  const skillIds = await resolveSkillIds(input.skillSlugs ?? []);

  const [created] = await db
    .insert(projects)
    .values({
      userId: actor.id,
      title: input.title,
      description: input.description ?? null,
      url: input.url ?? null,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
    })
    .returning({ id: projects.id });

  if (skillIds.length) {
    await db
      .insert(projectSkills)
      .values(skillIds.map((skillId) => ({ projectId: created!.id, skillId })));
  }

  return c.json({ projects: await readProjects(actor.id) }, 201);
});

portfolio.delete("/projects/:id", async (c) => {
  const actor = requireUser(c);
  // The userId predicate is the authorization: without it this deletes any
  // project whose id you can guess.
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, c.req.param("id")), eq(projects.userId, actor.id)))
    .returning({ id: projects.id });

  if (deleted.length === 0) throw new HTTPException(404, { message: "No such project" });
  return c.json({ projects: await readProjects(actor.id) });
});

function readCertifications(userId: string) {
  return db
    .select({
      id: certifications.id,
      name: certifications.name,
      issuer: certifications.issuer,
      issuedAt: certifications.issuedAt,
      credentialUrl: certifications.credentialUrl,
    })
    .from(certifications)
    .where(eq(certifications.userId, userId))
    .orderBy(desc(certifications.issuedAt));
}

const CertificationInput = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).nullable().optional(),
  issuedAt: z.iso.datetime().nullable().optional(),
  credentialUrl: z.url().nullable().optional(),
});

portfolio.get("/certifications", async (c) => {
  const actor = requireUser(c);
  return c.json({ certifications: await readCertifications(actor.id) });
});

portfolio.post("/certifications", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, CertificationInput);

  await db.insert(certifications).values({
    userId: actor.id,
    name: input.name,
    issuer: input.issuer ?? null,
    issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
    credentialUrl: input.credentialUrl ?? null,
  });

  return c.json({ certifications: await readCertifications(actor.id) }, 201);
});

portfolio.delete("/certifications/:id", async (c) => {
  const actor = requireUser(c);
  const deleted = await db
    .delete(certifications)
    .where(
      and(
        eq(certifications.id, c.req.param("id")),
        eq(certifications.userId, actor.id),
      ),
    )
    .returning({ id: certifications.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "No such certification" });
  }
  return c.json({ certifications: await readCertifications(actor.id) });
});
