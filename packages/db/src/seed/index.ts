import { createHash } from "node:crypto";

import { createDb } from "../client";
import {
  resources,
  roleRequirements,
  skillPrerequisites,
  skills,
  targetRoles,
} from "../schema/index";
import { CATEGORIES, SKILLS } from "./taxonomy";
import { RESOURCES } from "./resources";
import { ROLES } from "./roles";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Deterministic ids from slugs, so re-seeding updates rows instead of
// orphaning anything that references them.
function idFor(kind: string, slug: string): string {
  const h = createHash("sha1").update(`${kind}:${slug}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join("-");
}

function validate() {
  const bySlug = new Map(SKILLS.map((s) => [s.slug, s]));
  const subs = new Set(
    CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.slug)),
  );

  const problems: string[] = [];

  for (const s of SKILLS) {
    if (!subs.has(s.sub)) problems.push(`${s.slug}: unknown subcategory ${s.sub}`);
    for (const p of s.prereqs ?? []) {
      if (!bySlug.has(p)) problems.push(`${s.slug}: unknown prerequisite ${p}`);
    }
  }

  for (const r of ROLES) {
    for (const req of r.requirements) {
      if (!bySlug.has(req.skill)) {
        problems.push(`role ${r.slug}: unknown skill ${req.skill}`);
      }
    }
  }

  for (const r of RESOURCES) {
    if (!bySlug.has(r.skill)) {
      problems.push(`resource "${r.title}": unknown skill ${r.skill}`);
    }
  }

  // Depth-first cycle detection. A cycle makes the roadmap's topological sort
  // undefined, and nothing downstream would report it.
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map<string, number>(SKILLS.map((s) => [s.slug, WHITE]));
  const stack: string[] = [];

  const walk = (slug: string) => {
    colour.set(slug, GREY);
    stack.push(slug);
    for (const p of bySlug.get(slug)?.prereqs ?? []) {
      const c = colour.get(p);
      if (c === GREY) {
        problems.push(`cycle: ${[...stack.slice(stack.indexOf(p)), p].join(" -> ")}`);
      } else if (c === WHITE) {
        walk(p);
      }
    }
    stack.pop();
    colour.set(slug, BLACK);
  };

  for (const s of SKILLS) if (colour.get(s.slug) === WHITE) walk(s.slug);

  if (problems.length) {
    console.error("seed validation failed:");
    for (const p of problems) console.error("  -", p);
    process.exit(1);
  }
}

validate();

const db = createDb(url, { max: 1 });

const subToCategory = new Map<string, string>();
for (const c of CATEGORIES) {
  for (const s of c.subcategories) subToCategory.set(s.slug, c.slug);
}

const skillRows = [
  ...CATEGORIES.map((c) => ({
    id: idFor("skill", c.slug),
    slug: c.slug,
    name: c.name,
    altitude: "CATEGORY" as const,
    parentId: null,
    categoryId: idFor("skill", c.slug),
    description: c.description,
  })),
  ...CATEGORIES.flatMap((c) =>
    c.subcategories.map((s) => ({
      id: idFor("skill", s.slug),
      slug: s.slug,
      name: s.name,
      altitude: "SUBCATEGORY" as const,
      parentId: idFor("skill", c.slug),
      categoryId: idFor("skill", c.slug),
      description: s.description,
    })),
  ),
  ...SKILLS.map((s) => ({
    id: idFor("skill", s.slug),
    slug: s.slug,
    name: s.name,
    altitude: "SKILL" as const,
    parentId: idFor("skill", s.sub),
    categoryId: idFor("skill", subToCategory.get(s.sub)!),
    description: s.description ?? null,
  })),
];

await db
  .insert(skills)
  .values(skillRows)
  .onConflictDoUpdate({
    target: skills.slug,
    set: {
      name: skills.name,
      description: skills.description,
      parentId: skills.parentId,
      categoryId: skills.categoryId,
    },
  });

const edgeRows = SKILLS.flatMap((s) =>
  (s.prereqs ?? []).map((p) => ({
    skillId: idFor("skill", s.slug),
    prerequisiteId: idFor("skill", p),
  })),
);

await db.insert(skillPrerequisites).values(edgeRows).onConflictDoNothing();

await db
  .insert(targetRoles)
  .values(
    ROLES.map((r) => ({
      id: idFor("role", r.slug),
      slug: r.slug,
      name: r.name,
      summary: r.summary,
      description: r.description,
    })),
  )
  .onConflictDoUpdate({
    target: targetRoles.slug,
    set: {
      name: targetRoles.name,
      summary: targetRoles.summary,
      description: targetRoles.description,
    },
  });

await db
  .insert(roleRequirements)
  .values(
    ROLES.flatMap((r) =>
      r.requirements.map((req) => ({
        roleId: idFor("role", r.slug),
        skillId: idFor("skill", req.skill),
        requiredLevel: req.level,
        weight: req.weight,
      })),
    ),
  )
  .onConflictDoUpdate({
    target: [roleRequirements.roleId, roleRequirements.skillId],
    set: {
      requiredLevel: roleRequirements.requiredLevel,
      weight: roleRequirements.weight,
    },
  });

await db.delete(resources);
await db.insert(resources).values(
  RESOURCES.map((r) => ({
    skillId: idFor("skill", r.skill),
    title: r.title,
    type: r.type,
    provider: r.provider ?? null,
    url: r.url ?? null,
    summary: r.summary ?? null,
  })),
);

const categories = CATEGORIES.length;
const subcategories = CATEGORIES.reduce(
  (n, c) => n + c.subcategories.length,
  0,
);

console.log(
  `seeded ${categories} categories, ${subcategories} subcategories, ` +
    `${SKILLS.length} skills, ${edgeRows.length} prerequisite edges, ` +
    `${ROLES.length} roles, ${RESOURCES.length} resources`,
);

process.exit(0);
