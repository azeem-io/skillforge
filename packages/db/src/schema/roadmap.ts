import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth.ts";
import { skills, targetRoles } from "./skills.ts";

export const roadmapStatus = pgEnum("roadmap_status", [
  "draft",
  "active",
  "archived",
]);

// Stored output, not a source of truth. Python computes phase and ordering;
// the LLM only fills narration and rationale.
export const roadmaps = pgTable(
  "roadmaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetRoleId: uuid("target_role_id")
      .notNull()
      .references(() => targetRoles.id, { onDelete: "cascade" }),
    status: roadmapStatus("status").notNull().default("draft"),
    // Frozen at generation rather than computed on read, so regenerating later
    // shows movement instead of overwriting the evidence of it.
    readinessScore: smallint("readiness_score"),
    narration: text("narration"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("roadmaps_user_idx").on(t.userId, t.generatedAt),
    check(
      "roadmaps_readiness_range",
      sql`${t.readinessScore} is null or ${t.readinessScore} between 0 and 100`,
    ),
  ],
);

// One rank of the topological sort. Skills sharing a phase can be learned in
// parallel — that is what sharing a rank means.
export const roadmapPhases = pgTable(
  "roadmap_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    phase: integer("phase").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale"),
    estimatedWeeks: smallint("estimated_weeks"),
  },
  (t) => [
    index("roadmap_phases_roadmap_idx").on(t.roadmapId, t.phase),
    check("roadmap_phases_phase_positive", sql`${t.phase} >= 1`),
  ],
);

export const roadmapPhaseSkills = pgTable(
  "roadmap_phase_skills",
  {
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => roadmapPhases.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    gapScore: smallint("gap_score"),
  },
  (t) => [
    primaryKey({ columns: [t.phaseId, t.skillId] }),
    index("roadmap_phase_skills_skill_idx").on(t.skillId),
  ],
);

export const roadmapsRelations = relations(roadmaps, ({ one, many }) => ({
  user: one(users, { fields: [roadmaps.userId], references: [users.id] }),
  targetRole: one(targetRoles, {
    fields: [roadmaps.targetRoleId],
    references: [targetRoles.id],
  }),
  phases: many(roadmapPhases),
}));

export const roadmapPhasesRelations = relations(
  roadmapPhases,
  ({ one, many }) => ({
    roadmap: one(roadmaps, {
      fields: [roadmapPhases.roadmapId],
      references: [roadmaps.id],
    }),
    skills: many(roadmapPhaseSkills),
  }),
);

export const roadmapPhaseSkillsRelations = relations(
  roadmapPhaseSkills,
  ({ one }) => ({
    phase: one(roadmapPhases, {
      fields: [roadmapPhaseSkills.phaseId],
      references: [roadmapPhases.id],
    }),
    skill: one(skills, {
      fields: [roadmapPhaseSkills.skillId],
      references: [skills.id],
    }),
  }),
);
