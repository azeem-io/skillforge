import { rm } from "node:fs/promises";
import { join } from "node:path";

import {
  attemptAnswers,
  attempts,
  assessments,
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
  sessions,
  skills,
  skillState,
  studentSkills,
  targetRoles,
  uploads,
  users,
} from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { aliasedTable, and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { db, env, type Vars } from "../context";

/**
 * The two things a person is entitled to do with their own record: take it
 * with them, and end it.
 *
 * Both live here rather than being split across the services that own each
 * table. A person's data does not respect service boundaries — their attempts
 * are skill-service's, their CV is this one's, their account row is
 * auth-service's — and answering "give me everything" from three places would
 * mean three partial answers that drift. skill-service already reads
 * `student_skills`, which this service owns, so reading across is the
 * established direction here rather than a new one.
 */
export const account = new Hono<Vars>();

/**
 * Everything the system holds about the caller, as one JSON document.
 *
 * Credential material is deliberately absent: the argon2id hash and live
 * session tokens are the means of *access* to the account, not facts about the
 * person, and a downloadable file containing either is a liability rather than
 * a disclosure. Sessions appear as metadata so somebody can see where they are
 * signed in, with the token withheld.
 */
account.get("/account/export", async (c) => {
  const actor = requireUser(c);
  const id = actor.id;

  const [account_, profile] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        headline: profiles.headline,
        bio: profiles.bio,
        education: profiles.education,
        experienceLevel: profiles.experienceLevel,
        targetRole: targetRoles.slug,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .leftJoin(targetRoles, eq(targetRoles.id, profiles.targetRoleId))
      .where(eq(profiles.userId, id))
      .then((rows) => rows[0] ?? null),
  ]);

  if (!account_) throw new HTTPException(404, { message: "No such account" });

  const mentor = aliasedTable(users, "mentor");
  const student = aliasedTable(users, "student");

  const [
    claimedSkills,
    ownProjects,
    projectSkillRows,
    ownCertifications,
    ownUploads,
    ownSessions,
    asStudent,
    asMentor,
    ownAttempts,
    ownAnswers,
    schedule,
    reviewLog,
    ownRoadmaps,
    phases,
    phaseSkills,
  ] = await Promise.all([
    db
      .select({
        skill: skills.slug,
        name: skills.name,
        level: studentSkills.level,
        source: studentSkills.source,
        evidence: studentSkills.evidence,
        updatedAt: studentSkills.updatedAt,
      })
      .from(studentSkills)
      .innerJoin(skills, eq(skills.id, studentSkills.skillId))
      .where(eq(studentSkills.userId, id)),
    db.select().from(projects).where(eq(projects.userId, id)),
    db
      .select({ projectId: projectSkills.projectId, skill: skills.slug })
      .from(projectSkills)
      .innerJoin(projects, eq(projects.id, projectSkills.projectId))
      .innerJoin(skills, eq(skills.id, projectSkills.skillId))
      .where(eq(projects.userId, id)),
    db.select().from(certifications).where(eq(certifications.userId, id)),
    db
      .select({
        id: uploads.id,
        filename: uploads.filename,
        mimeType: uploads.mimeType,
        sizeBytes: uploads.sizeBytes,
        createdAt: uploads.createdAt,
      })
      .from(uploads)
      .where(eq(uploads.userId, id)),
    db
      .select({
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, id)),
    db
      .select({ mentorEmail: mentor.email, mentorName: mentor.name })
      .from(mentorships)
      .innerJoin(mentor, eq(mentor.id, mentorships.mentorId))
      .where(eq(mentorships.studentId, id)),
    db
      .select({ studentEmail: student.email, studentName: student.name })
      .from(mentorships)
      .innerJoin(student, eq(student.id, mentorships.studentId))
      .where(eq(mentorships.mentorId, id)),
    db
      .select({
        id: attempts.id,
        assessment: assessments.slug,
        title: assessments.title,
        startedAt: attempts.startedAt,
        completedAt: attempts.completedAt,
        score: attempts.score,
        maxScore: attempts.maxScore,
      })
      .from(attempts)
      .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
      .where(eq(attempts.userId, id))
      .orderBy(desc(attempts.startedAt)),
    db
      .select({
        attemptId: attemptAnswers.attemptId,
        question: questions.question,
        response: attemptAnswers.response,
        isCorrect: attemptAnswers.isCorrect,
        answeredAt: attemptAnswers.answeredAt,
      })
      .from(attemptAnswers)
      .innerJoin(attempts, eq(attempts.id, attemptAnswers.attemptId))
      .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
      .where(eq(attempts.userId, id)),
    db
      .select({
        skill: skills.slug,
        due: skillState.due,
        stability: skillState.stability,
        difficulty: skillState.difficulty,
        reps: skillState.reps,
        lapses: skillState.lapses,
        lastReview: skillState.lastReview,
      })
      .from(skillState)
      .innerJoin(skills, eq(skills.id, skillState.skillId))
      .where(eq(skillState.userId, id)),
    db
      .select({
        skill: skills.slug,
        grade: reviews.grade,
        reviewedAt: reviews.reviewedAt,
      })
      .from(reviews)
      .innerJoin(skills, eq(skills.id, reviews.skillId))
      .where(eq(reviews.userId, id))
      .orderBy(desc(reviews.reviewedAt)),
    db
      .select({
        id: roadmaps.id,
        role: targetRoles.slug,
        status: roadmaps.status,
        readinessScore: roadmaps.readinessScore,
        narration: roadmaps.narration,
        generatedAt: roadmaps.generatedAt,
      })
      .from(roadmaps)
      .leftJoin(targetRoles, eq(targetRoles.id, roadmaps.targetRoleId))
      .where(eq(roadmaps.userId, id)),
    db
      .select({
        roadmapId: roadmapPhases.roadmapId,
        phase: roadmapPhases.phase,
        title: roadmapPhases.title,
        rationale: roadmapPhases.rationale,
        estimatedWeeks: roadmapPhases.estimatedWeeks,
      })
      .from(roadmapPhases)
      .innerJoin(roadmaps, eq(roadmaps.id, roadmapPhases.roadmapId))
      .where(eq(roadmaps.userId, id))
      .orderBy(asc(roadmapPhases.phase)),
    db
      .select({ phaseId: roadmapPhaseSkills.phaseId, skill: skills.slug })
      .from(roadmapPhaseSkills)
      .innerJoin(roadmapPhases, eq(roadmapPhases.id, roadmapPhaseSkills.phaseId))
      .innerJoin(roadmaps, eq(roadmaps.id, roadmapPhases.roadmapId))
      .innerJoin(skills, eq(skills.id, roadmapPhaseSkills.skillId))
      .where(eq(roadmaps.userId, id)),
  ]);

  const skillsByProject = new Map<string, string[]>();
  for (const row of projectSkillRows) {
    skillsByProject.set(row.projectId, [
      ...(skillsByProject.get(row.projectId) ?? []),
      row.skill,
    ]);
  }
  const answersByAttempt = new Map<string, typeof ownAnswers>();
  for (const row of ownAnswers) {
    answersByAttempt.set(row.attemptId, [
      ...(answersByAttempt.get(row.attemptId) ?? []),
      row,
    ]);
  }
  const skillsByPhase = new Map<string, string[]>();
  for (const row of phaseSkills) {
    skillsByPhase.set(row.phaseId, [
      ...(skillsByPhase.get(row.phaseId) ?? []),
      row.skill,
    ]);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    note:
      "Everything SkillForge holds about this account. Your password hash and " +
      "live session tokens are deliberately excluded — they are the keys to " +
      "the account rather than facts about you, and putting them in a file " +
      "you might email to someone would be a security problem, not a right.",
    account: account_,
    profile,
    skills: claimedSkills,
    projects: ownProjects.map((project) => ({
      ...project,
      skills: skillsByProject.get(project.id) ?? [],
    })),
    certifications: ownCertifications,
    // Metadata only. The bytes stay behind the download route, which is
    // already the way to get your own CV back.
    uploads: ownUploads,
    assessments: ownAttempts.map((attempt) => ({
      ...attempt,
      answers: (answersByAttempt.get(attempt.id) ?? []).map(
        ({ attemptId: _attemptId, ...rest }) => rest,
      ),
    })),
    reviewSchedule: schedule,
    reviewHistory: reviewLog,
    roadmaps: ownRoadmaps.map((roadmap) => ({
      ...roadmap,
      phases: phases
        .filter((phase) => phase.roadmapId === roadmap.id)
        .map(({ roadmapId: _roadmapId, ...rest }) => rest),
    })),
    mentors: asStudent,
    students: asMentor,
    sessions: ownSessions,
  };

  // Named so a download lands as something recognisable rather than "export".
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="skillforge-export-${stamp}.json"`,
    },
  });
});

const Deletion = z.object({
  /** Typed by hand. A button alone deletes accounts by accident. */
  email: z.string().min(1),
});

/**
 * Deletes the account and everything hanging off it.
 *
 * The `users` row is the only thing this removes: every table holding personal
 * data references it `on delete cascade`, so one delete takes the profile,
 * skills, portfolio, attempts, answers, schedule, review history, roadmaps,
 * mentorships and sessions with it. `resources.created_by` and
 * `assessments.created_by` are `set null` instead, so content a mentor
 * contributed survives them, unattributed — deleting a person should not
 * delete the library.
 *
 * Files are not rows and do not cascade, so the upload directory goes first.
 */
account.delete("/account", async (c) => {
  const actor = requireUser(c);
  const { email } = await body(c, Deletion);

  const [row] = await db
    .select({ email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, actor.id));
  if (!row) throw new HTTPException(404, { message: "No such account" });

  if (email.trim().toLowerCase() !== row.email.toLowerCase()) {
    throw new HTTPException(400, {
      message: "That is not the email on this account.",
    });
  }

  // An instance with no administrator cannot be administered back into having
  // one: promotion is an admin-only route. Deleting the last one bricks it.
  if (row.role === "admin") {
    const [remaining] = await db
      .select({ others: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, actor.id)));
    if ((remaining?.others ?? 0) === 0) {
      throw new HTTPException(409, {
        message:
          "You are the only administrator. Promote someone else before deleting this account.",
      });
    }
  }

  // Before the row, not after: if this throws, the account still exists and
  // the request can be retried. The other order leaves orphaned files behind
  // with nothing left pointing at them.
  await rm(join(env.uploadDir, actor.id), { recursive: true, force: true });

  await db.delete(users).where(eq(users.id, actor.id));

  return c.json({ ok: true });
});
