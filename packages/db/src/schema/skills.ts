import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

// Named altitude, not level — `level` already means proficiency in
// studentSkills and roleRequirements.
export const skillAltitude = pgEnum("skill_altitude", [
  "CATEGORY",
  "SUBCATEGORY",
  "SKILL",
]);

// One table, two structures over it: a tree via parentId (the Skill Tree view)
// and a DAG via skillPrerequisites (the Skill Graph and the roadmap).
export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    altitude: skillAltitude("altitude").notNull(),
    parentId: uuid("parent_id").references((): any => skills.id, {
      onDelete: "cascade",
    }),
    // Denormalised root category, so grouping and colouring never walks the
    // tree. Rows never change parents after seeding.
    categoryId: uuid("category_id").references((): any => skills.id, {
      onDelete: "cascade",
    }),
    description: text("description"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("skills_slug_uq").on(t.slug),
    index("skills_parent_idx").on(t.parentId),
    index("skills_category_idx").on(t.categoryId),
    index("skills_altitude_idx").on(t.altitude),
    check(
      "skills_root_shape",
      sql`(${t.altitude} = 'CATEGORY' and ${t.parentId} is null) or (${t.altitude} <> 'CATEGORY' and ${t.parentId} is not null)`,
    ),
  ],
);

// Leaf-to-leaf only, and acyclic. Neither is expressible in SQL — both are
// enforced on write and verified by SkillGraph.validate() in the Python service.
export const skillPrerequisites = pgTable(
  "skill_prerequisites",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    prerequisiteId: uuid("prerequisite_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    // hard gates the phase ordering; soft lets the layering collapse two
    // skills into one phase when that shortens the path.
    strength: text("strength", { enum: ["hard", "soft"] })
      .notNull()
      .default("hard"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.skillId, t.prerequisiteId] }),
    index("skill_prereq_prerequisite_idx").on(t.prerequisiteId),
    check("skill_prereq_no_self", sql`${t.skillId} <> ${t.prerequisiteId}`),
  ],
);

export const targetRoles = pgTable(
  "target_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("target_roles_slug_uq").on(t.slug)],
);

export const roleRequirements = pgTable(
  "role_requirements",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => targetRoles.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    requiredLevel: smallint("required_level").notNull(),
    // Without a weight every gap scores the same and the roadmap has no basis
    // for ordering anything.
    weight: smallint("weight").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.skillId] }),
    index("role_requirements_skill_idx").on(t.skillId),
    check(
      "role_requirements_level_range",
      sql`${t.requiredLevel} between 1 and 5`,
    ),
    check("role_requirements_weight_range", sql`${t.weight} between 1 and 5`),
  ],
);

export const resourceType = pgEnum("resource_type", [
  "course",
  "article",
  "video",
  "book",
  "project",
  "documentation",
]);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    type: resourceType("type").notNull(),
    provider: text("provider"),
    summary: text("summary"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("resources_skill_idx").on(t.skillId)],
);

export const skillsRelations = relations(skills, ({ one, many }) => ({
  parent: one(skills, {
    relationName: "skill_parent",
    fields: [skills.parentId],
    references: [skills.id],
  }),
  children: many(skills, { relationName: "skill_parent" }),
  resources: many(resources),
}));

export const targetRolesRelations = relations(targetRoles, ({ many }) => ({
  requirements: many(roleRequirements),
}));

export const roleRequirementsRelations = relations(
  roleRequirements,
  ({ one }) => ({
    role: one(targetRoles, {
      fields: [roleRequirements.roleId],
      references: [targetRoles.id],
    }),
    skill: one(skills, {
      fields: [roleRequirements.skillId],
      references: [skills.id],
    }),
  }),
);

export const resourcesRelations = relations(resources, ({ one }) => ({
  skill: one(skills, { fields: [resources.skillId], references: [skills.id] }),
}));
