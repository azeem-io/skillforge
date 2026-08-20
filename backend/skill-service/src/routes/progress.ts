import { reviews, skills, skillState, studentSkills } from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";
import {
  GRADES,
  MASTERY_LEVELS,
  masteryLevel,
  newSchedulingState,
  schedule,
  type Grade,
  type SchedulingState,
} from "../scheduler";

export const progress = new Hono<Vars>();

function toSchedulingState(row: typeof skillState.$inferSelect): SchedulingState {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    lastReview: row.lastReview,
    state: row.state,
    scheduledDays: row.scheduledDays,
    elapsedDays: row.elapsedDays,
    learningSteps: row.learningSteps,
  };
}

/**
 * Every skill the student has state for, with the FSRS mastery bucket and
 * whether it is due. Decay is the point: a skill assessed months ago comes back
 * around, and "mastered" has to be re-earned rather than being a permanent badge.
 */
progress.get("/progress", async (c) => {
  const actor = requireUser(c);
  const now = new Date();

  const rows = await db
    .select({
      state: skillState,
      slug: skills.slug,
      name: skills.name,
      level: studentSkills.level,
      source: studentSkills.source,
    })
    .from(skillState)
    .innerJoin(skills, eq(skills.id, skillState.skillId))
    .leftJoin(
      studentSkills,
      and(
        eq(studentSkills.skillId, skillState.skillId),
        eq(studentSkills.userId, actor.id),
      ),
    )
    .where(eq(skillState.userId, actor.id))
    .orderBy(asc(skillState.due));

  const items = rows.map((row) => {
    const bucket = masteryLevel(toSchedulingState(row.state));
    return {
      slug: row.slug,
      name: row.name,
      level: row.level ?? 0,
      source: row.source,
      due: row.state.due,
      isDue: row.state.due <= now,
      reps: row.state.reps,
      lapses: row.state.lapses,
      scheduledDays: row.state.scheduledDays,
      mastery: MASTERY_LEVELS[bucket],
      masteryIndex: bucket,
    };
  });

  const buckets = MASTERY_LEVELS.map((label, index) => ({
    label,
    count: items.filter((item) => item.masteryIndex === index).length,
  }));

  return c.json({
    skills: items,
    dueNow: items.filter((item) => item.isDue).length,
    tracked: items.length,
    buckets,
  });
});

/** Only what is due, for a review session. */
progress.get("/progress/due", async (c) => {
  const actor = requireUser(c);
  const rows = await db
    .select({
      slug: skills.slug,
      name: skills.name,
      due: skillState.due,
      reps: skillState.reps,
    })
    .from(skillState)
    .innerJoin(skills, eq(skills.id, skillState.skillId))
    .where(and(eq(skillState.userId, actor.id), lte(skillState.due, new Date())))
    .orderBy(asc(skillState.due))
    .limit(50);
  return c.json({ due: rows });
});

const ReviewInput = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

/**
 * A review outside an assessment — the student judging their own recall. It
 * moves the schedule but deliberately does not touch `studentSkills`: a
 * self-graded review is not evidence of a proficiency level.
 */
progress.post("/progress/:slug/review", async (c) => {
  const actor = requireUser(c);
  const { grade } = await body(c, ReviewInput);
  const now = new Date();

  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.slug, c.req.param("slug")));
  if (!skill) throw new HTTPException(404, { message: "No such skill" });

  const [existing] = await db
    .select()
    .from(skillState)
    .where(
      and(eq(skillState.userId, actor.id), eq(skillState.skillId, skill.id)),
    );

  const result = schedule(
    existing ? toSchedulingState(existing) : newSchedulingState(now),
    grade as Grade,
    now,
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(skillState)
      .values({ userId: actor.id, skillId: skill.id, ...result.next })
      .onConflictDoUpdate({
        target: [skillState.userId, skillState.skillId],
        set: result.next,
      });
    await tx.insert(reviews).values({
      userId: actor.id,
      skillId: skill.id,
      grade,
      reviewedAt: now,
      state: result.log,
    });
  });

  return c.json({
    due: result.next.due,
    intervalDays: result.intervalDays,
    label: result.label,
    grades: GRADES,
  });
});

/** Reviews per day for the last 90 days, for the dashboard chart. */
progress.get("/progress/history", async (c) => {
  const actor = requireUser(c);
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${reviews.reviewedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, actor.id),
        sql`${reviews.reviewedAt} > now() - interval '90 days'`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${reviews.reviewedAt})`)
    .orderBy(sql`date_trunc('day', ${reviews.reviewedAt})`);
  return c.json({ history: rows });
});

/** Recent reviews, newest first. */
progress.get("/progress/reviews", async (c) => {
  const actor = requireUser(c);
  const rows = await db
    .select({
      slug: skills.slug,
      name: skills.name,
      grade: reviews.grade,
      reviewedAt: reviews.reviewedAt,
    })
    .from(reviews)
    .innerJoin(skills, eq(skills.id, reviews.skillId))
    .where(eq(reviews.userId, actor.id))
    .orderBy(desc(reviews.reviewedAt))
    .limit(50);
  return c.json({ reviews: rows });
});
