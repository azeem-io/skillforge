import { relations, sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { skills } from "./skills";

export const FSRS_STATE = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const;

// Keyed on skill rather than on a single question, so proficiency decays and
// has to be re-earned. Every column here is needed to reconstruct a ts-fsrs
// Card; state in particular selects which scheduling branch runs.
export const skillState = pgTable(
  "skill_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: doublePrecision("stability").notNull().default(0),
    difficulty: doublePrecision("difficulty").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReview: timestamp("last_review", { withTimezone: true }),
    state: smallint("state").notNull().default(FSRS_STATE.New),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.skillId] }),
    index("skill_state_user_due_idx").on(t.userId, t.due),
    check("skill_state_state_range", sql`${t.state} between 0 and 3`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    elapsedMs: integer("elapsed_ms"),
    state: jsonb("state"),
  },
  (t) => [
    index("reviews_user_reviewed_idx").on(t.userId, t.reviewedAt),
    index("reviews_skill_idx").on(t.skillId),
    check("reviews_grade_range", sql`${t.grade} between 1 and 4`),
  ],
);

export const skillStateRelations = relations(skillState, ({ one }) => ({
  user: one(users, { fields: [skillState.userId], references: [users.id] }),
  skill: one(skills, { fields: [skillState.skillId], references: [skills.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  skill: one(skills, { fields: [reviews.skillId], references: [skills.id] }),
}));
