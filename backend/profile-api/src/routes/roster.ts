import { readiness, roleSkillGraph } from "@skillforge/db";
import {
  mentorships,
  profiles,
  skills,
  studentSkills,
  targetRoles,
  users,
} from "@skillforge/db/schema";
import { USER_ROLES, body, requireRole, requireUser } from "@skillforge/service-kit";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";

export const roster = new Hono<Vars>();

type Row = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  experienceLevel: string | null;
  targetRoleSlug: string | null;
  targetRoleName: string | null;
};

async function rows(ids: string[] | null): Promise<Row[]> {
  const base = db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      experienceLevel: profiles.experienceLevel,
      targetRoleSlug: targetRoles.slug,
      targetRoleName: targetRoles.name,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(targetRoles, eq(targetRoles.id, profiles.targetRoleId))
    .orderBy(asc(users.email));

  if (ids === null) return base;
  if (ids.length === 0) return [];
  return base.where(inArray(users.id, ids));
}

/** Demonstrated-skill counts for a set of users, in one query rather than N. */
async function skillCounts(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const counted = await db
    .select({ userId: studentSkills.userId, total: count() })
    .from(studentSkills)
    .where(inArray(studentSkills.userId, ids))
    .groupBy(studentSkills.userId);
  return new Map(counted.map((row) => [row.userId, Number(row.total)]));
}

/**
 * Readiness for whichever role each student is aiming at. Computed here rather
 * than asked of skill-service because the roster needs it for every row at
 * once, and a per-student round trip would make the page quadratic.
 */
async function readinessFor(list: Row[]): Promise<Map<string, number>> {
  const aiming = list.filter((row) => row.targetRoleSlug);
  if (aiming.length === 0) return new Map();

  const levels = await db
    .select({
      userId: studentSkills.userId,
      slug: skills.slug,
      level: studentSkills.level,
    })
    .from(studentSkills)
    .innerJoin(skills, eq(skills.id, studentSkills.skillId))
    .where(inArray(studentSkills.userId, aiming.map((row) => row.userId)));

  const byUser = new Map<string, Record<string, number>>();
  for (const row of levels) {
    const entry = byUser.get(row.userId) ?? {};
    entry[row.slug] = row.level;
    byUser.set(row.userId, entry);
  }

  const scores = new Map<string, number>();
  // One graph per distinct role, reused across the students aiming at it.
  for (const slug of new Set(aiming.map((row) => row.targetRoleSlug!))) {
    for (const row of aiming.filter((r) => r.targetRoleSlug === slug)) {
      const graph = await roleSkillGraph(db, slug, byUser.get(row.userId) ?? {});
      scores.set(row.userId, readiness(graph.skills));
    }
  }
  return scores;
}

/**
 * The roster. An admin sees everyone; a mentor sees only the students assigned
 * to them, which is the same `mentorships` join that guards reading one.
 */
roster.get("/students", async (c) => {
  const actor = requireRole(c, "mentor", "admin");

  let list: Row[];
  if (actor.role === "admin") {
    list = await rows(null);
  } else {
    const assigned = await db
      .select({ studentId: mentorships.studentId })
      .from(mentorships)
      .where(eq(mentorships.mentorId, actor.id));
    list = await rows(assigned.map((row) => row.studentId));
  }

  const ids = list.map((row) => row.userId);
  const [counts, scores] = await Promise.all([
    skillCounts(ids),
    readinessFor(list),
  ]);

  return c.json({
    students: list.map((row) => ({
      ...row,
      demonstrated: counts.get(row.userId) ?? 0,
      readiness: scores.get(row.userId) ?? null,
    })),
  });
});

const RoleChange = z.object({ role: z.enum(USER_ROLES) });

/**
 * Promotion and demotion, admin only. An admin cannot demote themselves — the
 * last admin doing so would leave nobody able to promote anyone back.
 */
roster.put("/students/:userId/role", async (c) => {
  const actor = requireRole(c, "admin");
  const userId = c.req.param("userId");
  const { role } = await body(c, RoleChange);

  if (userId === actor.id && role !== "admin") {
    throw new HTTPException(409, {
      message: "You cannot remove your own admin role.",
    });
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) throw new HTTPException(404, { message: "No such user" });
  return c.json({ user: updated });
});

const Assignment = z.object({ mentorId: z.string().min(1) });

/** Assigning a mentor is what makes `requireReadAccess` grant them anything. */
roster.put("/students/:userId/mentor", async (c) => {
  requireRole(c, "admin");
  const studentId = c.req.param("userId");
  const { mentorId } = await body(c, Assignment);

  if (mentorId === studentId) {
    throw new HTTPException(409, {
      message: "A student cannot mentor themselves.",
    });
  }

  const [mentor] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, mentorId));

  if (!mentor) throw new HTTPException(404, { message: "No such mentor" });
  if (mentor.role === "student") {
    throw new HTTPException(409, {
      message: "Promote them to mentor before assigning students.",
    });
  }

  await db
    .insert(mentorships)
    .values({ mentorId, studentId })
    .onConflictDoNothing();

  return c.json({ mentorId, studentId });
});

roster.delete("/students/:userId/mentor/:mentorId", async (c) => {
  requireRole(c, "admin");
  await db
    .delete(mentorships)
    .where(
      and(
        eq(mentorships.studentId, c.req.param("userId")),
        eq(mentorships.mentorId, c.req.param("mentorId")),
      ),
    );
  return c.json({ removed: true });
});

/** Who each student's mentors are, for the admin roster. */
roster.get("/mentorships", async (c) => {
  requireUser(c);
  requireRole(c, "mentor", "admin");

  const pairs = await db
    .select({
      mentorId: mentorships.mentorId,
      studentId: mentorships.studentId,
      mentorName: users.name,
      mentorEmail: users.email,
    })
    .from(mentorships)
    .innerJoin(users, eq(users.id, mentorships.mentorId));

  return c.json({ mentorships: pairs });
});
