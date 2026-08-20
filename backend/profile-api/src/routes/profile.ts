import {
  profiles,
  skills,
  studentSkills,
  targetRoles,
  users,
} from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, requireReadAccess, type Vars } from "../context";

export const profile = new Hono<Vars>();

async function readProfile(userId: string) {
  const [row] = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      headline: profiles.headline,
      bio: profiles.bio,
      education: profiles.education,
      experienceLevel: profiles.experienceLevel,
      targetRoleId: profiles.targetRoleId,
      targetRoleSlug: targetRoles.slug,
      targetRoleName: targetRoles.name,
      cvUploadId: profiles.cvUploadId,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(targetRoles, eq(targetRoles.id, profiles.targetRoleId))
    .where(eq(users.id, userId));

  if (!row) throw new HTTPException(404, { message: "No such user" });

  // A user with no profile row is not an error — it is a student who has not
  // filled anything in yet, and the UI needs the same shape either way.
  return { ...row, experienceLevel: row.experienceLevel ?? "beginner" };
}

async function readSkills(userId: string) {
  return db
    .select({
      skillId: studentSkills.skillId,
      slug: skills.slug,
      name: skills.name,
      level: studentSkills.level,
      source: studentSkills.source,
      evidence: studentSkills.evidence,
      updatedAt: studentSkills.updatedAt,
    })
    .from(studentSkills)
    .innerJoin(skills, eq(skills.id, studentSkills.skillId))
    .where(eq(studentSkills.userId, userId))
    .orderBy(asc(skills.name));
}

profile.get("/me", async (c) => {
  const actor = requireUser(c);
  return c.json({ profile: await readProfile(actor.id) });
});

const ProfileUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  headline: z.string().max(200).nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  education: z.string().max(500).nullable().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  targetRoleSlug: z.string().min(1).nullable().optional(),
});

profile.put("/me", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, ProfileUpdate);

  let targetRoleId: string | null | undefined;
  if (input.targetRoleSlug !== undefined) {
    if (input.targetRoleSlug === null) {
      targetRoleId = null;
    } else {
      const [role] = await db
        .select({ id: targetRoles.id })
        .from(targetRoles)
        .where(eq(targetRoles.slug, input.targetRoleSlug));
      if (!role) throw new HTTPException(400, { message: "No such target role" });
      targetRoleId = role.id;
    }
  }

  if (input.name !== undefined) {
    await db.update(users).set({ name: input.name }).where(eq(users.id, actor.id));
  }

  // Drizzle writes an explicit NULL for a key whose value is undefined, so
  // keys the caller did not send are dropped rather than blanking the column.
  const set = Object.fromEntries(
    Object.entries({
      headline: input.headline,
      bio: input.bio,
      education: input.education,
      experienceLevel: input.experienceLevel,
      targetRoleId,
    }).filter(([, value]) => value !== undefined),
  );

  await db
    .insert(profiles)
    .values({ userId: actor.id, ...set })
    .onConflictDoUpdate({ target: profiles.userId, set });

  return c.json({ profile: await readProfile(actor.id) });
});

profile.get("/skills", async (c) => {
  const actor = requireUser(c);
  return c.json({ skills: await readSkills(actor.id) });
});

const SkillClaims = z.object({
  skills: z
    .array(
      z.object({
        slug: z.string().min(1),
        level: z.number().int().min(1).max(5),
        evidence: z.string().max(500).nullable().optional(),
      }),
    )
    .max(200),
});

/**
 * Self-reported levels only. `source` is pinned here rather than taken from
 * the body: a level the student typed must never reach the gap calculation
 * wearing the weight of an assessment result.
 */
profile.put("/skills", async (c) => {
  const actor = requireUser(c);
  const { skills: claims } = await body(c, SkillClaims);

  if (claims.length === 0) return c.json({ skills: await readSkills(actor.id) });

  const slugs = claims.map((claim) => claim.slug);
  const known = await db
    .select({ id: skills.id, slug: skills.slug, altitude: skills.altitude })
    .from(skills)
    .where(inArray(skills.slug, slugs));

  const bySlug = new Map(known.map((row) => [row.slug, row]));
  const unknown = slugs.filter((slug) => !bySlug.has(slug));
  if (unknown.length) {
    throw new HTTPException(400, { message: `Unknown skills: ${unknown.join(", ")}` });
  }

  // Proficiency is only meaningful on a leaf — a level on "Web Development"
  // has nothing to compare against in roleRequirements.
  const notLeaves = known.filter((row) => row.altitude !== "SKILL");
  if (notLeaves.length) {
    throw new HTTPException(400, {
      message: `Not leaf skills: ${notLeaves.map((row) => row.slug).join(", ")}`,
    });
  }

  await db
    .insert(studentSkills)
    .values(
      claims.map((claim) => ({
        userId: actor.id,
        skillId: bySlug.get(claim.slug)!.id,
        level: claim.level,
        source: "self_reported" as const,
        evidence: claim.evidence ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: [studentSkills.userId, studentSkills.skillId],
      set: {
        level: studentSkills.level,
        source: studentSkills.source,
        evidence: studentSkills.evidence,
      },
    });

  return c.json({ skills: await readSkills(actor.id) });
});

profile.delete("/skills/:slug", async (c) => {
  const actor = requireUser(c);
  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.slug, c.req.param("slug")));
  if (!skill) throw new HTTPException(404, { message: "No such skill" });

  await db
    .delete(studentSkills)
    .where(
      and(eq(studentSkills.userId, actor.id), eq(studentSkills.skillId, skill.id)),
    );
  return c.json({ skills: await readSkills(actor.id) });
});

/**
 * The mentor and admin read path. Same projection as `/me`, a different
 * authorization check — and that check is a database join, not a role string.
 */
profile.get("/students/:userId", async (c) => {
  const userId = c.req.param("userId");
  await requireReadAccess(c, userId);
  return c.json({
    profile: await readProfile(userId),
    skills: await readSkills(userId),
  });
});
