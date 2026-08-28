import {
  questions,
  reviews,
  skills,
  skillState,
} from "@skillforge/db/schema";
import { body, query, requireUser } from "@skillforge/service-kit";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, type Vars } from "../context";
import { isCorrect, outcomesBySkill, type GradableQuestion } from "../grading";
import {
  GRADE_LABELS,
  reviewGrade,
  schedule,
  type SchedulingState,
} from "../scheduler";

/**
 * The other half of the FSRS engine. `skill_state` has been computing decay
 * since assessments shipped, but nothing ever asked it what was due, so a
 * schedule was produced and never honoured — the spacing effect implemented
 * and then left unread.
 *
 * A review is retrieval, not self-rating: the student answers real questions
 * from the bank and the grade comes out of the grader, the same way a sitting's
 * does. `POST /progress/:slug/review` keeps the self-graded path for a skill
 * with no questions behind it.
 */
export const reviewRoutes = new Hono<Vars>();

/** One session. Long enough to be worth opening, short enough to finish. */
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;
/** Per skill. Most skills have exactly one question; a few have up to four. */
const QUESTIONS_PER_SKILL = 2;

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
 * Consecutive questions come from different categories wherever the queue
 * allows it. Practising one area in a block feels easier and retains worse
 * than mixing them; the due queue is already a natural mix, and this keeps it
 * from clumping when several skills in one area come due together.
 */
function interleave<T>(items: T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const queues = [...groups.entries()];
  const out: T[] = [];
  let last: string | null = null;

  while (out.length < items.length) {
    // Largest remaining group first, so the biggest one cannot be left to run
    // as an unbroken tail at the end; then skip the group just placed, which
    // is what actually breaks up a run.
    queues.sort((a, b) => b[1].length - a[1].length);

    const next =
      queues.find(([key, queue]) => queue.length > 0 && key !== last) ??
      queues.find(([, queue]) => queue.length > 0);
    if (!next) break;

    out.push(next[1].shift()!);
    last = next[0];
  }
  return out;
}

/**
 * What is due, and the questions to probe it with. Answers, correct indices
 * and explanations stay server-side, exactly as they do for an assessment.
 */
reviewRoutes.get("/review/session", async (c) => {
  const actor = requireUser(c);
  const { limit } = query(
    c,
    z.object({ limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional() }),
  );
  const now = new Date();

  const due = await db
    .select({
      skillId: skillState.skillId,
      slug: skills.slug,
      name: skills.name,
      due: skillState.due,
      reps: skillState.reps,
      lapses: skillState.lapses,
    })
    .from(skillState)
    .innerJoin(skills, eq(skills.id, skillState.skillId))
    .where(and(eq(skillState.userId, actor.id), lte(skillState.due, now)))
    .orderBy(asc(skillState.due))
    .limit(limit ?? DEFAULT_LIMIT);

  if (due.length === 0) {
    const [next] = await db
      .select({ due: skillState.due })
      .from(skillState)
      .where(eq(skillState.userId, actor.id))
      .orderBy(asc(skillState.due))
      .limit(1);
    return c.json({ questions: [], skills: [], nextDue: next?.due ?? null });
  }

  const bank = await db
    .select({
      id: questions.id,
      ordinal: questions.ordinal,
      type: questions.type,
      question: questions.question,
      choices: questions.choices,
      difficulty: questions.difficulty,
      skillId: questions.skillId,
      skillSlug: skills.slug,
      skillName: skills.name,
    })
    .from(questions)
    .innerJoin(skills, eq(skills.id, questions.skillId))
    .where(
      inArray(
        questions.skillId,
        due.map((row) => row.skillId),
      ),
    )
    .orderBy(asc(questions.ordinal));

  // Rotate through the bank by how many times the skill has been reviewed, so
  // a skill with more than one question does not show the same item forever.
  const repsBySkill = new Map(due.map((row) => [row.skillId, row.reps]));
  const bySkill = new Map<string, typeof bank>();
  for (const row of bank) {
    const list = bySkill.get(row.skillId!) ?? [];
    list.push(row);
    bySkill.set(row.skillId!, list);
  }

  const picked: typeof bank = [];
  for (const [skillId, list] of bySkill) {
    const offset = (repsBySkill.get(skillId) ?? 0) % list.length;
    for (let i = 0; i < Math.min(QUESTIONS_PER_SKILL, list.length); i++) {
      const item = list[(offset + i) % list.length];
      if (item) picked.push(item);
    }
  }

  const ordered = interleave(picked, (row) => row.skillSlug);

  return c.json({
    questions: ordered.map((row) => ({
      id: row.id,
      ordinal: row.ordinal,
      type: row.type,
      question: row.question,
      choices: row.choices,
      difficulty: row.difficulty,
      skillSlug: row.skillSlug,
      skillName: row.skillName,
    })),
    skills: due.map((row) => ({
      slug: row.slug,
      name: row.name,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
    })),
    nextDue: null,
  });
});

const ReviewSubmission = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        response: z.string().max(2000),
      }),
    )
    .min(1)
    .max(MAX_LIMIT * QUESTIONS_PER_SKILL),
});

/**
 * Grades a session and advances the schedule. One transaction, like a sitting.
 *
 * Deliberately does not write `student_skills`: a two-question probe is a
 * retention check, not a proficiency measurement, and letting it overwrite a
 * level earned over ten questions would degrade the evidence behind the graph
 * every time somebody kept up with their reviews. The schedule is what a
 * review is for.
 */
reviewRoutes.post("/review/submit", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, ReviewSubmission);
  const now = new Date();

  const asked = await db
    .select({
      id: questions.id,
      type: questions.type,
      answer: questions.answer,
      correct: questions.correct,
      skillId: questions.skillId,
      difficulty: questions.difficulty,
      explanation: questions.explanation,
      skillSlug: skills.slug,
      skillName: skills.name,
    })
    .from(questions)
    .innerJoin(skills, eq(skills.id, questions.skillId))
    .where(
      inArray(
        questions.id,
        input.answers.map((answer) => answer.questionId),
      ),
    );

  if (asked.length !== input.answers.length) {
    throw new HTTPException(400, { message: "Unknown question in submission" });
  }

  // A review only moves a skill the student has already demonstrated. Without
  // this a caller could open a schedule on any skill in the taxonomy by
  // answering one question about it, which is not a review of anything.
  const tracked = await db
    .select()
    .from(skillState)
    .where(
      and(
        eq(skillState.userId, actor.id),
        inArray(
          skillState.skillId,
          asked.map((row) => row.skillId!),
        ),
      ),
    );
  const stateBySkill = new Map(tracked.map((row) => [row.skillId, row]));

  const gradable = asked.filter((row) => stateBySkill.has(row.skillId!));
  if (gradable.length === 0) {
    throw new HTTPException(400, {
      message: "None of these skills are on your review schedule",
    });
  }

  const responses = new Map(
    input.answers.map((answer) => [answer.questionId, answer.response]),
  );
  const graded = gradable.map((question) => ({
    question: question as GradableQuestion,
    isCorrect: isCorrect(
      question as GradableQuestion,
      responses.get(question.id) ?? "",
    ),
  }));

  const outcomes = outcomesBySkill(graded);
  const byId = new Map(asked.map((row) => [row.id, row]));

  const results = await db.transaction(async (tx) => {
    const out = [];
    for (const outcome of outcomes) {
      const existing = stateBySkill.get(outcome.skillId)!;
      const grade = reviewGrade(outcome.ratio, outcome.total);
      const result = schedule(
        toSchedulingState(existing),
        grade,
        now,
        outcome.recognitionOnly,
      );

      await tx
        .update(skillState)
        .set(result.next)
        .where(
          and(
            eq(skillState.userId, actor.id),
            eq(skillState.skillId, outcome.skillId),
          ),
        );

      await tx.insert(reviews).values({
        userId: actor.id,
        skillId: outcome.skillId,
        grade,
        reviewedAt: now,
        state: result.log,
      });

      const sample = graded.find(
        (row) => row.question.skillId === outcome.skillId,
      );
      out.push({
        slug: byId.get(sample!.question.id)!.skillSlug,
        name: byId.get(sample!.question.id)!.skillName,
        correct: outcome.correct,
        total: outcome.total,
        grade,
        gradeLabel: GRADE_LABELS[grade],
        // What the recognition penalty actually did, so the number is
        // explainable rather than mysterious.
        recognitionOnly: outcome.recognitionOnly,
        intervalLabel: result.label,
        due: result.next.due,
        lapsed: grade === 1,
      });
    }
    return out;
  });

  // Worst first, the same order the assessment breakdown uses.
  results.sort((a, b) => a.correct / a.total - b.correct / b.total);

  const [outstanding] = await db
    .select({ remaining: sql<number>`count(*)::int` })
    .from(skillState)
    .where(and(eq(skillState.userId, actor.id), lte(skillState.due, now)));
  const remaining = outstanding?.remaining ?? 0;

  return c.json({
    results,
    answers: graded.map(({ question, isCorrect: right }) => ({
      questionId: question.id,
      isCorrect: right,
      response: responses.get(question.id) ?? null,
      answer: byId.get(question.id)!.answer,
      correct: byId.get(question.id)!.correct,
      explanation: byId.get(question.id)!.explanation,
    })),
    remaining,
  });
});
