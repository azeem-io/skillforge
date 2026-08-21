/**
 * A populated demo account, so a judge who never registers still sees a
 * working system. Separate from `db:seed` on purpose: that one seeds the
 * catalogue every install needs and runs before any service starts, this one
 * invents people and has to run after it.
 *
 * Nothing here is invented twice. Passwords go through auth-service's own
 * `hashPassword`, answers through skill-service's grader, proficiency through
 * its FSRS scheduler, and the roadmap through the same layering the route
 * uses — so the demo student is indistinguishable from one who registered and
 * sat the assessments by hand.
 *
 * Re-running updates in place: every row this writes is keyed on a
 * deterministic id or a natural key.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { createDb } from "../client";
import {
  gapScore,
  phases as layerLocally,
  phaseTitle,
  phaseWeeks,
  readiness,
  roleSkillGraph,
} from "../queries/skills";
import {
  accounts,
  assessments,
  attemptAnswers,
  attempts,
  certifications,
  mentorships,
  profiles,
  projects,
  projectSkills,
  questions,
  reviews,
  roadmapPhases,
  roadmapPhaseSkills,
  roadmaps,
  skills,
  skillState,
  studentSkills,
  targetRoles,
  users,
} from "../schema/index";

// Reaching into two services on purpose. These are the implementations the
// running system uses, not copies of them: a demo account hashed by a second
// hasher or graded by a second grader would be a demo of those instead. It is
// also why this file is the one place in packages/db that depends on a
// service, and why it is a script rather than an export.
import { hashPassword } from "../../../../backend/auth-service/src/password";
import {
  isCorrect,
  outcomesBySkill,
  type GradableQuestion,
} from "../../../../backend/skill-service/src/grading";
import {
  gradeFromRatio,
  levelFromRatio,
  newSchedulingState,
  schedule,
  type SchedulingState,
} from "../../../../backend/skill-service/src/scheduler";
import { idFor } from "./ids";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Better Auth's minimum is 12 characters; anything shorter here would seed an
// account the sign-in form would then refuse to accept.
const PASSWORD = process.env.DEMO_PASSWORD || "skillforge-demo-2026";
if (PASSWORD.length < 12) {
  console.error("DEMO_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const PEOPLE = {
  student: {
    id: "demo-student",
    name: "Ayesha Khan",
    email: "demo@example.com",
    role: "student" as const,
  },
  mentor: {
    id: "demo-mentor",
    name: "Omar Farooq",
    email: "mentor@example.com",
    role: "mentor" as const,
  },
  admin: {
    id: "demo-admin",
    name: "Sana Iqbal",
    email: "admin@example.com",
    role: "admin" as const,
  },
};

/** First match wins, so the demo still works if the catalogue is trimmed. */
const ROLE_PREFERENCE = ["ai-engineer", "backend-engineer", "frontend-engineer"];

/**
 * The sittings to simulate, oldest first, with the share of questions the
 * student gets right. Strong on Python and Git, thinner on databases, weakest
 * on the AI half of the goal — a shape that leaves the graph, the gaps and the
 * roadmap all with something to show.
 */
const SITTINGS = [
  { slug: "python-fundamentals", ratio: 0.9, daysAgo: 26 },
  { slug: "git-fundamentals", ratio: 0.8, daysAgo: 19 },
  { slug: "database-fundamentals", ratio: 0.6, daysAgo: 11 },
  { slug: "ai-fundamentals", ratio: 0.4, daysAgo: 3 },
];

const DAY_MS = 86_400_000;
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

const db = createDb(url, { max: 1 });

const [anySkill] = await db.select({ id: skills.id }).from(skills).limit(1);
if (!anySkill) {
  console.error("The catalogue is empty — run `bun run db:seed` first.");
  process.exit(1);
}

// ---------------------------------------------------------------- accounts

const hash = await hashPassword(PASSWORD);

for (const person of Object.values(PEOPLE)) {
  await db
    .insert(users)
    .values({
      id: person.id,
      name: person.name,
      email: person.email,
      // Nothing sends mail, and an unverified demo account is a dead end.
      emailVerified: true,
      role: person.role,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: person.name, email: person.email, role: person.role },
    });

  await db
    .insert(accounts)
    .values({
      id: `${person.id}-credential`,
      accountId: person.id,
      providerId: "credential",
      // Required since Better Auth 1.7; credential accounts carry this
      // synthetic value. See the comment on `accounts` in packages/db.
      issuer: "local:credential",
      userId: person.id,
      password: hash,
    })
    .onConflictDoUpdate({ target: accounts.id, set: { password: hash } });
}

// ----------------------------------------------------------------- profile

const roles = await db
  .select({ id: targetRoles.id, slug: targetRoles.slug, name: targetRoles.name })
  .from(targetRoles);

const role =
  ROLE_PREFERENCE.map((slug) => roles.find((r) => r.slug === slug)).find(Boolean) ??
  roles[0];
if (!role) {
  console.error("No target roles in the database — run `bun run db:seed` first.");
  process.exit(1);
}

await db
  .insert(profiles)
  .values({
    userId: PEOPLE.student.id,
    headline: "Final-year CS student aiming at AI engineering",
    bio:
      "Comfortable writing Python and shipping small services. Working through " +
      "the maths and the model side now, and looking for a first internship.",
    education: "BSc Computer Science, 2023-2027",
    experienceLevel: "intermediate",
    targetRoleId: role.id,
  })
  .onConflictDoUpdate({
    target: profiles.userId,
    set: {
      headline: "Final-year CS student aiming at AI engineering",
      experienceLevel: "intermediate",
      targetRoleId: role.id,
    },
  });

await db
  .insert(profiles)
  .values({
    userId: PEOPLE.mentor.id,
    headline: "Senior engineer, mentoring two students this term",
    experienceLevel: "advanced",
  })
  .onConflictDoUpdate({
    target: profiles.userId,
    set: { headline: "Senior engineer, mentoring two students this term" },
  });

await db
  .insert(profiles)
  .values({
    userId: PEOPLE.admin.id,
    headline: "Programme administrator",
    experienceLevel: "advanced",
  })
  .onConflictDoUpdate({
    target: profiles.userId,
    set: { headline: "Programme administrator" },
  });

await db
  .insert(mentorships)
  .values({ mentorId: PEOPLE.mentor.id, studentId: PEOPLE.student.id })
  .onConflictDoNothing();

// -------------------------------------------------------------- assessments

type QuestionRow = GradableQuestion & {
  ordinal: number;
  choices: string[] | null;
};

/**
 * Which questions the student gets right: the easiest `ratio` of the paper.
 * Difficulty-ordered rather than random, because a student who misses the two
 * hardest questions is a story, and one who misses a random 40% is noise.
 */
function correctSet(bank: QuestionRow[], ratio: number): Set<string> {
  const ordered = [...bank].sort(
    (a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3) || a.ordinal - b.ordinal,
  );
  return new Set(ordered.slice(0, Math.round(bank.length * ratio)).map((q) => q.id));
}

/** A response a student could plausibly have typed, right or wrong. */
function respond(question: QuestionRow, right: boolean, decoy: string | null): string {
  if (question.type === "mcq") {
    const correct = question.correct ?? [];
    if (right) return correct.join(",");
    const wrong = (question.choices ?? []).findIndex((_, i) => !correct.includes(i));
    return wrong === -1 ? "" : String(wrong);
  }

  const canonical = question.answer?.split("|")[0]?.trim() ?? "";
  if (right) return canonical;
  // Another answer from the same paper, which reads like a confusion rather
  // than like a row that was never filled in.
  return decoy && decoy !== canonical ? decoy : "not sure";
}

const published = await db
  .select({ id: assessments.id, slug: assessments.slug, title: assessments.title })
  .from(assessments)
  .where(eq(assessments.published, true));

const byAssessmentSlug = new Map(published.map((row) => [row.slug, row]));
const state = new Map<string, SchedulingState>();
const demonstrated: Record<string, number> = {};
let sittings = 0;

for (const sitting of SITTINGS) {
  const assessment = byAssessmentSlug.get(sitting.slug);
  if (!assessment) continue;

  const bank: QuestionRow[] = await db
    .select({
      id: questions.id,
      ordinal: questions.ordinal,
      type: questions.type,
      answer: questions.answer,
      correct: questions.correct,
      choices: questions.choices,
      skillId: questions.skillId,
      difficulty: questions.difficulty,
    })
    .from(questions)
    .where(eq(questions.assessmentId, assessment.id))
    .orderBy(asc(questions.ordinal));

  if (bank.length === 0) continue;

  const intended = correctSet(bank, sitting.ratio);
  const at = daysAgo(sitting.daysAgo);
  const attemptId = idFor("demo-attempt", `${PEOPLE.student.id}:${sitting.slug}`);

  let decoy: string | null = null;
  const graded = bank.map((question) => {
    const response = respond(question, intended.has(question.id), decoy);
    decoy = question.answer?.split("|")[0]?.trim() ?? decoy;
    // The grader decides, not the intent above: a seeded attempt that
    // disagreed with grading would be a demo of a bug.
    return { question, response, isCorrect: isCorrect(question, response) };
  });

  const score = graded.filter((row) => row.isCorrect).length;

  await db
    .insert(attempts)
    .values({
      id: attemptId,
      userId: PEOPLE.student.id,
      assessmentId: assessment.id,
      // A sitting takes a while; the result page shows both ends of it.
      startedAt: new Date(at.getTime() - 14 * 60_000),
      completedAt: at,
      score,
      maxScore: bank.length,
    })
    .onConflictDoUpdate({
      target: attempts.id,
      set: { completedAt: at, score, maxScore: bank.length },
    });

  await db
    .insert(attemptAnswers)
    .values(
      graded.map(({ question, response, isCorrect: right }) => ({
        attemptId,
        questionId: question.id,
        response,
        isCorrect: right,
        grade: right ? 3 : 1,
        answeredAt: at,
      })),
    )
    .onConflictDoUpdate({
      target: [attemptAnswers.attemptId, attemptAnswers.questionId],
      // `excluded`, not the column: the values differ per row, so naming the
      // column here would set every row back to what it already held.
      set: {
        response: sql`excluded.response`,
        isCorrect: sql`excluded.is_correct`,
        answeredAt: sql`excluded.answered_at`,
      },
    });

  for (const outcome of outcomesBySkill(graded)) {
    const grade = gradeFromRatio(outcome.ratio);
    const previous = state.get(outcome.skillId) ?? newSchedulingState(at);
    const result = schedule(previous, grade, at, outcome.recognitionOnly);
    state.set(outcome.skillId, result.next);

    await db
      .insert(skillState)
      .values({ userId: PEOPLE.student.id, skillId: outcome.skillId, ...result.next })
      .onConflictDoUpdate({
        target: [skillState.userId, skillState.skillId],
        set: result.next,
      });

    await db
      .insert(reviews)
      .values({
        id: idFor("demo-review", `${sitting.slug}:${outcome.skillId}`),
        userId: PEOPLE.student.id,
        skillId: outcome.skillId,
        grade,
        reviewedAt: at,
        state: result.log,
      })
      .onConflictDoNothing();

    const level = levelFromRatio(outcome.ratio);
    await db
      .insert(studentSkills)
      .values({
        userId: PEOPLE.student.id,
        skillId: outcome.skillId,
        level,
        source: "assessment",
        evidence: `${outcome.correct}/${outcome.total} on this assessment`,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: [studentSkills.userId, studentSkills.skillId],
        set: {
          level,
          source: "assessment",
          evidence: `${outcome.correct}/${outcome.total} on this assessment`,
        },
      });
  }

  sittings += 1;
  console.log(`  ${assessment.title}: ${score}/${bank.length}`);
}

// Graded evidence only. Re-running has to land on the same student, and the
// self-reported claims below are chosen from what the assessments left open —
// reading them back in would let each run claim four more skills.
const assessed = await db
  .select({ slug: skills.slug, level: studentSkills.level })
  .from(studentSkills)
  .innerJoin(skills, eq(skills.id, studentSkills.skillId))
  .where(
    and(
      eq(studentSkills.userId, PEOPLE.student.id),
      eq(studentSkills.source, "assessment"),
    ),
  );
for (const row of assessed) demonstrated[row.slug] = row.level;

// ------------------------------------------------------- self-reported claims

/**
 * Claims on skills the goal needs and the student can already start — the
 * roadmap's first phase, roughly. Chosen from the graph rather than hardcoded
 * so the demo survives a change to the taxonomy.
 */
await db
  .delete(studentSkills)
  .where(
    and(
      eq(studentSkills.userId, PEOPLE.student.id),
      eq(studentSkills.source, "self_reported"),
    ),
  );

const graph = await roleSkillGraph(db, role.slug, demonstrated);
const claimable = graph.skills
  .filter((row) => row.mastery === "gap" && !(row.slug in demonstrated))
  .sort((a, b) => gapScore(b) - gapScore(a) || a.slug.localeCompare(b.slug))
  .slice(0, 4);

for (const row of claimable) {
  const level = Math.max(1, Math.min(2, row.requiredLevel - 1));
  await db
    .insert(studentSkills)
    .values({
      userId: PEOPLE.student.id,
      skillId: row.id,
      level,
      source: "self_reported",
      evidence: "Used it on a university project, never assessed",
      updatedAt: daysAgo(30),
    })
    .onConflictDoUpdate({
      target: [studentSkills.userId, studentSkills.skillId],
      set: { level, source: "self_reported" },
    });
  demonstrated[row.slug] = level;
}

// ------------------------------------------------------------------ portfolio

const PROJECTS = [
  {
    key: "study-planner",
    title: "Study planner API",
    description:
      "FastAPI service that schedules revision sessions and tracks what stuck. " +
      "Postgres, ~40 tests, deployed with Docker Compose.",
    url: "https://github.com/skillforge-demo/study-planner",
    startedAt: daysAgo(210),
    completedAt: daysAgo(120),
  },
  {
    key: "campus-map",
    title: "Campus map",
    description:
      "React front end over an open dataset of campus buildings, with routing " +
      "between rooms. First project I wrote tests for before the code.",
    url: "https://github.com/skillforge-demo/campus-map",
    startedAt: daysAgo(95),
    completedAt: daysAgo(40),
  },
];

for (const project of PROJECTS) {
  const id = idFor("demo-project", project.key);
  await db
    .insert(projects)
    .values({
      id,
      userId: PEOPLE.student.id,
      title: project.title,
      description: project.description,
      url: project.url,
      startedAt: project.startedAt,
      completedAt: project.completedAt,
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: { title: project.title, description: project.description, url: project.url },
    });
}

// Tagged with the strongest demonstrated skills, so the portfolio and the
// graph agree about what this student can actually do.
const strongest = [...assessed]
  .sort((a, b) => b.level - a.level || a.slug.localeCompare(b.slug))
  .slice(0, 3)
  .map((row) => row.slug);

const strongestIds = strongest.length
  ? await db
      .select({ id: skills.id })
      .from(skills)
      .where(inArray(skills.slug, strongest))
  : [];

for (const project of PROJECTS) {
  for (const skill of strongestIds) {
    await db
      .insert(projectSkills)
      .values({ projectId: idFor("demo-project", project.key), skillId: skill.id })
      .onConflictDoNothing();
  }
}

await db
  .insert(certifications)
  .values({
    id: idFor("demo-certification", "aws-cloud-practitioner"),
    userId: PEOPLE.student.id,
    name: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    issuedAt: daysAgo(160),
    credentialUrl: "https://www.credly.com/users/skillforge-demo",
  })
  .onConflictDoNothing();

// -------------------------------------------------------------------- roadmap

/**
 * Structure only. `narration` and `rationale` stay null here for the same
 * reason they do in skill-service: prose comes from ai-service, and a seed
 * that wrote its own would be putting words in the model's mouth. Regenerating
 * from /roadmap with ai-service reachable fills them in.
 */
const planned = await roleSkillGraph(db, role.slug, demonstrated);
const layers = layerLocally(planned.skills);

await db.delete(roadmaps).where(eq(roadmaps.userId, PEOPLE.student.id));

if (layers.length) {
  const [created] = await db
    .insert(roadmaps)
    .values({
      id: idFor("demo-roadmap", PEOPLE.student.id),
      userId: PEOPLE.student.id,
      targetRoleId: role.id,
      status: "active",
      readinessScore: readiness(planned.skills),
      generatedAt: daysAgo(2),
    })
    .returning({ id: roadmaps.id });

  for (const [index, rows] of layers.entries()) {
    const [phase] = await db
      .insert(roadmapPhases)
      .values({
        id: idFor("demo-phase", `${PEOPLE.student.id}:${index + 1}`),
        roadmapId: created!.id,
        phase: index + 1,
        title: phaseTitle(rows, index + 1),
        estimatedWeeks: phaseWeeks(rows),
      })
      .returning({ id: roadmapPhases.id });

    await db.insert(roadmapPhaseSkills).values(
      [...rows]
        .sort((a, b) => gapScore(b) - gapScore(a))
        .map((row, ordinal) => ({
          phaseId: phase!.id,
          skillId: row.id,
          ordinal,
          gapScore: gapScore(row),
        })),
    );
  }
}

// --------------------------------------------------------------------- report

const claimed = await db
  .select({ skillId: studentSkills.skillId })
  .from(studentSkills)
  .where(eq(studentSkills.userId, PEOPLE.student.id));

const mentored = await db
  .select({ studentId: mentorships.studentId })
  .from(mentorships)
  .where(eq(mentorships.mentorId, PEOPLE.mentor.id));

console.log(
  `\nseeded ${Object.keys(PEOPLE).length} accounts, ${sittings} graded ` +
    `assessments, ${claimed.length} skills, ${PROJECTS.length} projects, ` +
    `${layers.length} roadmap phases, ${mentored.length} mentorship, ` +
    `${readiness(planned.skills)}% ready for ${role.name}\n`,
);
console.log(`  student  ${PEOPLE.student.email}`);
console.log(`  mentor   ${PEOPLE.mentor.email}`);
console.log(`  admin    ${PEOPLE.admin.email}`);
console.log(`  password ${PASSWORD}\n`);
console.log("  These are public credentials. Set SEED_DEMO=false on anything real.\n");

process.exit(0);
