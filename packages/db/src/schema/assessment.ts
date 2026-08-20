import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth.ts";
import { skills } from "./skills.ts";

export const questionType = pgEnum("question_type", ["recall", "cloze", "mcq"]);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    // Usually a SUBCATEGORY, so one sitting covers a coherent area.
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assessments_slug_uq").on(t.slug),
    index("assessments_skill_idx").on(t.skillId),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    // With assessmentId this is the natural key seeding upserts on, so ids stay
    // stable and attempt history is never orphaned.
    ordinal: integer("ordinal").notNull(),
    type: questionType("type").notNull(),
    question: text("question").notNull(),
    answer: text("answer"),
    choices: jsonb("choices").$type<string[]>(),
    correct: integer("correct").array(),
    explanation: text("explanation"),
    // Finer-grained than the assessment's own skill, which is what lets one
    // sitting produce a per-skill breakdown instead of a single score.
    skillId: uuid("skill_id").references(() => skills.id, {
      onDelete: "set null",
    }),
    difficulty: smallint("difficulty"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("questions_assessment_idx").on(t.assessmentId),
    index("questions_skill_idx").on(t.skillId),
    uniqueIndex("questions_assessment_ordinal_uq").on(
      t.assessmentId,
      t.ordinal,
    ),
    check(
      "questions_difficulty_range",
      sql`${t.difficulty} is null or ${t.difficulty} between 1 and 5`,
    ),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    score: integer("score"),
    maxScore: integer("max_score"),
  },
  (t) => [
    index("attempts_user_idx").on(t.userId, t.startedAt),
    index("attempts_assessment_idx").on(t.assessmentId),
  ],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    response: text("response"),
    isCorrect: boolean("is_correct").notNull(),
    // The FSRS grade this answer implies, so a sitting feeds the scheduler
    // directly rather than being re-graded afterwards.
    grade: smallint("grade"),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("attempt_answers_attempt_question_uq").on(
      t.attemptId,
      t.questionId,
    ),
    index("attempt_answers_question_idx").on(t.questionId),
    check(
      "attempt_answers_grade_range",
      sql`${t.grade} is null or ${t.grade} between 1 and 4`,
    ),
  ],
);

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  skill: one(skills, {
    fields: [assessments.skillId],
    references: [skills.id],
  }),
  questions: many(questions),
  attempts: many(attempts),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  assessment: one(assessments, {
    fields: [questions.assessmentId],
    references: [assessments.id],
  }),
  skill: one(skills, { fields: [questions.skillId], references: [skills.id] }),
}));

export const attemptsRelations = relations(attempts, ({ one, many }) => ({
  user: one(users, { fields: [attempts.userId], references: [users.id] }),
  assessment: one(assessments, {
    fields: [attempts.assessmentId],
    references: [assessments.id],
  }),
  answers: many(attemptAnswers),
}));

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
  attempt: one(attempts, {
    fields: [attemptAnswers.attemptId],
    references: [attempts.id],
  }),
  question: one(questions, {
    fields: [attemptAnswers.questionId],
    references: [questions.id],
  }),
}));
