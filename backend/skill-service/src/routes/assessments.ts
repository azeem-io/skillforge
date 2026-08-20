import {
  assessments,
  attemptAnswers,
  attempts,
  questions,
  reviews,
  skills,
  skillState,
  studentSkills,
} from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";
import { isCorrect, outcomesBySkill, type GradableQuestion } from "../grading";
import {
  gradeFromRatio,
  levelFromRatio,
  newSchedulingState,
  schedule,
  type SchedulingState,
} from "../scheduler";

export const assessmentRoutes = new Hono<Vars>();

assessmentRoutes.get("/assessments", async (c) => {
  const actor = c.get("identity");

  const rows = await db
    .select({
      slug: assessments.slug,
      title: assessments.title,
      description: assessments.description,
      skillSlug: skills.slug,
      skillName: skills.name,
      questionCount: count(questions.id),
    })
    .from(assessments)
    .innerJoin(skills, eq(skills.id, assessments.skillId))
    .leftJoin(questions, eq(questions.assessmentId, assessments.id))
    .where(eq(assessments.published, true))
    .groupBy(
      assessments.slug,
      assessments.title,
      assessments.description,
      skills.slug,
      skills.name,
    )
    .orderBy(asc(assessments.title));

  if (!actor) return c.json({ assessments: rows.map((r) => ({ ...r, best: null })) });

  // Best completed attempt per assessment, so the list can show progress
  // without a request per card.
  const best = await db
    .select({
      slug: assessments.slug,
      score: sql<number>`max(${attempts.score})`,
      maxScore: sql<number>`max(${attempts.maxScore})`,
      lastAt: sql<string>`max(${attempts.completedAt})`,
    })
    .from(attempts)
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(
      and(
        eq(attempts.userId, actor.id),
        sql`${attempts.completedAt} is not null`,
      ),
    )
    .groupBy(assessments.slug);

  const bySlug = new Map(best.map((row) => [row.slug, row]));
  return c.json({
    assessments: rows.map((row) => ({
      ...row,
      best: bySlug.get(row.slug) ?? null,
    })),
  });
});

/** Questions without `answer`, `correct` or `explanation` — the client never
 *  receives what it is being asked to produce. */
assessmentRoutes.get("/assessments/:slug", async (c) => {
  const [assessment] = await db
    .select({
      id: assessments.id,
      slug: assessments.slug,
      title: assessments.title,
      description: assessments.description,
    })
    .from(assessments)
    .where(
      and(
        eq(assessments.slug, c.req.param("slug")),
        eq(assessments.published, true),
      ),
    );

  if (!assessment) throw new HTTPException(404, { message: "No such assessment" });

  const rows = await db
    .select({
      id: questions.id,
      ordinal: questions.ordinal,
      type: questions.type,
      question: questions.question,
      choices: questions.choices,
      difficulty: questions.difficulty,
      skillSlug: skills.slug,
      skillName: skills.name,
    })
    .from(questions)
    .leftJoin(skills, eq(skills.id, questions.skillId))
    .where(eq(questions.assessmentId, assessment.id))
    .orderBy(asc(questions.ordinal));

  return c.json({ assessment, questions: rows });
});

assessmentRoutes.post("/assessments/:slug/attempts", async (c) => {
  const actor = requireUser(c);

  const [assessment] = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(
      and(
        eq(assessments.slug, c.req.param("slug")),
        eq(assessments.published, true),
      ),
    );
  if (!assessment) throw new HTTPException(404, { message: "No such assessment" });

  const [attempt] = await db
    .insert(attempts)
    .values({ userId: actor.id, assessmentId: assessment.id })
    .returning({ id: attempts.id, startedAt: attempts.startedAt });

  return c.json({ attempt }, 201);
});

const Submission = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        // MCQ answers arrive as comma-separated choice indices, so one field
        // carries every question type.
        response: z.string().max(2000),
      }),
    )
    .max(200),
});

/**
 * Grading, and the only path that writes evidence. One transaction: an attempt
 * that scored but failed to update proficiency would leave a student looking
 * less capable than their own answer sheet says.
 */
assessmentRoutes.post("/attempts/:id/submit", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, Submission);
  const attemptId = c.req.param("id");
  const now = new Date();

  const [attempt] = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      assessmentId: attempts.assessmentId,
      completedAt: attempts.completedAt,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId));

  if (!attempt) throw new HTTPException(404, { message: "No such attempt" });
  if (attempt.userId !== actor.id) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  if (attempt.completedAt) {
    throw new HTTPException(409, { message: "Attempt already submitted" });
  }

  const bank = await db
    .select({
      id: questions.id,
      type: questions.type,
      answer: questions.answer,
      correct: questions.correct,
      skillId: questions.skillId,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .where(eq(questions.assessmentId, attempt.assessmentId));

  const byId = new Map<string, GradableQuestion>(bank.map((q) => [q.id, q]));

  const responses = new Map(input.answers.map((a) => [a.questionId, a.response]));
  const unknown = [...responses.keys()].filter((id) => !byId.has(id));
  if (unknown.length) {
    throw new HTTPException(400, {
      message: "Answers reference questions from another assessment",
    });
  }

  // Every question in the bank is graded, not only the ones answered: an
  // unanswered question is wrong, and leaving it out would inflate the score.
  const graded = bank.map((question) => ({
    question,
    isCorrect: isCorrect(question, responses.get(question.id) ?? ""),
  }));

  const score = graded.filter((row) => row.isCorrect).length;
  const outcomes = outcomesBySkill(graded);

  const stateRows = await db
    .select()
    .from(skillState)
    .where(
      and(
        eq(skillState.userId, actor.id),
        inArray(
          skillState.skillId,
          outcomes.map((outcome) => outcome.skillId),
        ),
      ),
    );
  const stateBySkill = new Map(stateRows.map((row) => [row.skillId, row]));

  await db.transaction(async (tx) => {
    await tx.insert(attemptAnswers).values(
      graded.map(({ question, isCorrect: right }) => ({
        attemptId,
        questionId: question.id,
        response: responses.get(question.id) ?? null,
        isCorrect: right,
        // The FSRS grade this single answer implies, so a sitting feeds the
        // scheduler directly rather than being re-graded afterwards.
        grade: right ? 3 : 1,
      })),
    );

    await tx
      .update(attempts)
      .set({ completedAt: now, score, maxScore: bank.length })
      .where(eq(attempts.id, attemptId));

    for (const outcome of outcomes) {
      const level = levelFromRatio(outcome.ratio);
      const grade = gradeFromRatio(outcome.ratio);

      const existing = stateBySkill.get(outcome.skillId);
      const current: SchedulingState = existing
        ? {
            due: existing.due,
            stability: existing.stability,
            difficulty: existing.difficulty,
            reps: existing.reps,
            lapses: existing.lapses,
            lastReview: existing.lastReview,
            state: existing.state,
            scheduledDays: existing.scheduledDays,
            elapsedDays: existing.elapsedDays,
            learningSteps: existing.learningSteps,
          }
        : newSchedulingState(now);

      const result = schedule(current, grade, now, outcome.recognitionOnly);

      await tx
        .insert(skillState)
        .values({ userId: actor.id, skillId: outcome.skillId, ...result.next })
        .onConflictDoUpdate({
          target: [skillState.userId, skillState.skillId],
          set: result.next,
        });

      await tx.insert(reviews).values({
        userId: actor.id,
        skillId: outcome.skillId,
        grade,
        reviewedAt: now,
        state: result.log,
      });

      // Assessment evidence overwrites a self-reported claim or an earlier
      // sitting, and leaves project and certification evidence alone — those
      // were earned somewhere this quiz cannot see.
      await tx
        .insert(studentSkills)
        .values({
          userId: actor.id,
          skillId: outcome.skillId,
          level,
          source: "assessment",
          evidence: `${outcome.correct}/${outcome.total} on this assessment`,
        })
        .onConflictDoUpdate({
          target: [studentSkills.userId, studentSkills.skillId],
          set: {
            level: sql`excluded.level`,
            source: sql`excluded.source`,
            evidence: sql`excluded.evidence`,
          },
          setWhere: inArray(studentSkills.source, ["self_reported", "assessment"]),
        });
    }
  });

  return c.json({ result: await readAttempt(attemptId, actor.id) });
});

async function readAttempt(attemptId: string, userId: string) {
  const [attempt] = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      slug: assessments.slug,
      title: assessments.title,
      startedAt: attempts.startedAt,
      completedAt: attempts.completedAt,
      score: attempts.score,
      maxScore: attempts.maxScore,
    })
    .from(attempts)
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(eq(attempts.id, attemptId));

  if (!attempt) throw new HTTPException(404, { message: "No such attempt" });
  if (attempt.userId !== userId) throw new HTTPException(403, { message: "Forbidden" });

  const answers = await db
    .select({
      questionId: questions.id,
      ordinal: questions.ordinal,
      type: questions.type,
      question: questions.question,
      choices: questions.choices,
      correct: questions.correct,
      answer: questions.answer,
      explanation: questions.explanation,
      response: attemptAnswers.response,
      isCorrect: attemptAnswers.isCorrect,
      skillSlug: skills.slug,
      skillName: skills.name,
    })
    .from(attemptAnswers)
    .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
    .leftJoin(skills, eq(skills.id, questions.skillId))
    .where(eq(attemptAnswers.attemptId, attemptId))
    .orderBy(asc(questions.ordinal));

  // The per-skill breakdown the roadmap consumes, rebuilt for display.
  const bySkill = new Map<
    string,
    { slug: string; name: string; correct: number; total: number }
  >();
  for (const row of answers) {
    if (!row.skillSlug || !row.skillName) continue;
    const entry = bySkill.get(row.skillSlug) ?? {
      slug: row.skillSlug,
      name: row.skillName,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (row.isCorrect) entry.correct += 1;
    bySkill.set(row.skillSlug, entry);
  }

  return {
    attempt,
    answers,
    breakdown: [...bySkill.values()]
      .map((entry) => ({ ...entry, level: levelFromRatio(entry.correct / entry.total) }))
      .sort((a, b) => a.correct / a.total - b.correct / b.total),
  };
}

/** Answers, explanations and the breakdown — only after submission. */
assessmentRoutes.get("/attempts/:id", async (c) => {
  const actor = requireUser(c);
  return c.json({ result: await readAttempt(c.req.param("id"), actor.id) });
});

assessmentRoutes.get("/attempts", async (c) => {
  const actor = requireUser(c);
  const rows = await db
    .select({
      id: attempts.id,
      slug: assessments.slug,
      title: assessments.title,
      score: attempts.score,
      maxScore: attempts.maxScore,
      completedAt: attempts.completedAt,
    })
    .from(attempts)
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .where(eq(attempts.userId, actor.id))
    .orderBy(desc(attempts.startedAt))
    .limit(50);
  return c.json({ attempts: rows });
});
