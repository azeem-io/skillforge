import {
  gapScore,
  phases as layerLocally,
  phaseTitle,
  phaseWeeks,
  readiness,
  roleSkillGraph,
  type SkillRow,
} from "@skillforge/db";
import {
  profiles,
  roadmapPhases,
  roadmapPhaseSkills,
  roadmaps,
  skills,
  targetRoles,
} from "@skillforge/db/schema";
import { body, requireUser } from "@skillforge/service-kit";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { requestRoadmap, type AnalyzerPhase } from "../analyzer";
import { db, type Vars } from "../context";
import { requestNarration } from "../narrator";
import { demonstratedLevels } from "./taxonomy";

export const roadmapRoutes = new Hono<Vars>();

const Generate = z.object({ roleSlug: z.string().min(1).optional() });

/**
 * Builds the roadmap and stores it. The structure comes from python-analyzer
 * when it is reachable; when it is not, it comes from `phases()` in
 * packages/db — the same longest-path layering in TypeScript.
 *
 * Either way no model decides ordering. Once the phases are settled they go to
 * ai-service, which writes `narration` and `rationale` and nothing else.
 */
roadmapRoutes.post("/roadmap", async (c) => {
  const actor = requireUser(c);
  const input = await body(c, Generate);

  let roleSlug = input.roleSlug;
  if (!roleSlug) {
    const [profile] = await db
      .select({ slug: targetRoles.slug })
      .from(profiles)
      .innerJoin(targetRoles, eq(targetRoles.id, profiles.targetRoleId))
      .where(eq(profiles.userId, actor.id));
    roleSlug = profile?.slug;
  }
  if (!roleSlug) {
    throw new HTTPException(400, {
      message: "No target role. Pass roleSlug or set one on the profile.",
    });
  }

  const graph = await roleSkillGraph(
    db,
    roleSlug,
    await demonstratedLevels(actor.id),
  ).catch(() => {
    throw new HTTPException(404, { message: `No such role: ${roleSlug}` });
  });

  const [role] = await db
    .select({ id: targetRoles.id })
    .from(targetRoles)
    .where(eq(targetRoles.slug, roleSlug));
  if (!role) throw new HTTPException(404, { message: `No such role: ${roleSlug}` });

  const bySlug = new Map(graph.skills.map((row) => [row.slug, row]));
  const analyzed = await requestRoadmap(
    { slug: roleSlug, name: graph.role.name },
    graph.skills,
  );

  const computed: AnalyzerPhase[] = analyzed
    ? analyzed.phases
    : layerLocally(graph.skills).map((rows, index) => ({
        phase: index + 1,
        title: phaseTitle(rows, index + 1),
        estimatedWeeks: phaseWeeks(rows),
        skills: rows
          .slice()
          .sort((a, b) => gapScore(b) - gapScore(a))
          .map((row, ordinal) => ({
            slug: row.slug,
            ordinal,
            gapScore: gapScore(row),
          })),
      }));

  if (computed.length === 0) {
    throw new HTTPException(409, {
      message: "Nothing to plan — every skill this role requires is already met.",
    });
  }

  const readinessScore = analyzed?.readinessScore ?? readiness(graph.skills);

  // Prose, after the structure is settled and never before. Null when
  // ai-service cannot answer, which leaves the columns null and the plan
  // unchanged — the frontend already reads a missing rationale as "nothing
  // blocks these".
  const prose = await requestNarration({
    role: graph.role.name,
    readiness: readinessScore,
    phases: computed.map((phase) => {
      const rows = phase.skills
        .map((entry) => bySlug.get(entry.slug))
        .filter((row): row is SkillRow => Boolean(row));
      return {
        phase: phase.phase,
        title: phase.title ?? phaseTitle(rows, phase.phase),
        estimatedWeeks: phase.estimatedWeeks ?? phaseWeeks(rows),
        skills: rows.map((row) => row.name),
      };
    }),
    strengths: graph.skills
      .filter((row) => row.level > 0)
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((row) => `${row.name} at level ${row.level}`),
  });

  const roadmapId = await db.transaction(async (tx) => {
    // Previous roadmaps are archived, not deleted: regenerating later should
    // show movement, not overwrite the evidence of it.
    await tx
      .update(roadmaps)
      .set({ status: "archived" })
      .where(and(eq(roadmaps.userId, actor.id), eq(roadmaps.status, "active")));

    const [created] = await tx
      .insert(roadmaps)
      .values({
        userId: actor.id,
        targetRoleId: role.id,
        status: "active",
        readinessScore,
        narration: prose?.narration ?? analyzed?.narration ?? null,
      })
      .returning({ id: roadmaps.id });

    for (const phase of computed) {
      const rows = phase.skills
        .map((entry) => bySlug.get(entry.slug))
        .filter((row): row is SkillRow => Boolean(row));

      const [storedPhase] = await tx
        .insert(roadmapPhases)
        .values({
          roadmapId: created!.id,
          phase: phase.phase,
          title: phase.title ?? phaseTitle(rows, phase.phase),
          rationale: prose?.rationales[phase.phase] ?? phase.rationale ?? null,
          estimatedWeeks: phase.estimatedWeeks ?? phaseWeeks(rows),
        })
        .returning({ id: roadmapPhases.id });

      const values = phase.skills
        .map((entry, index) => {
          const row = bySlug.get(entry.slug);
          if (!row) return null;
          return {
            phaseId: storedPhase!.id,
            skillId: row.id,
            ordinal: entry.ordinal ?? index,
            gapScore: entry.gapScore ?? gapScore(row),
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);

      if (values.length) {
        // A skill the analyzer names twice in one phase would violate the
        // composite primary key and abort the whole generation.
        await tx.insert(roadmapPhaseSkills).values(values).onConflictDoNothing();
      }
    }

    return created!.id;
  });

  return c.json(
    {
      roadmap: await readRoadmap(roadmapId, actor.id),
      source: analyzed ? "python-analyzer" : "local",
      narrated: Boolean(prose?.narration),
    },
    201,
  );
});

async function readRoadmap(roadmapId: string, userId: string) {
  const [roadmap] = await db
    .select({
      id: roadmaps.id,
      userId: roadmaps.userId,
      status: roadmaps.status,
      readinessScore: roadmaps.readinessScore,
      narration: roadmaps.narration,
      generatedAt: roadmaps.generatedAt,
      roleSlug: targetRoles.slug,
      roleName: targetRoles.name,
    })
    .from(roadmaps)
    .innerJoin(targetRoles, eq(targetRoles.id, roadmaps.targetRoleId))
    .where(eq(roadmaps.id, roadmapId));

  if (!roadmap) throw new HTTPException(404, { message: "No such roadmap" });
  if (roadmap.userId !== userId) throw new HTTPException(403, { message: "Forbidden" });

  const rows = await db
    .select({
      phase: roadmapPhases.phase,
      phaseId: roadmapPhases.id,
      title: roadmapPhases.title,
      rationale: roadmapPhases.rationale,
      estimatedWeeks: roadmapPhases.estimatedWeeks,
      ordinal: roadmapPhaseSkills.ordinal,
      gapScore: roadmapPhaseSkills.gapScore,
      slug: skills.slug,
      name: skills.name,
    })
    .from(roadmapPhases)
    .leftJoin(roadmapPhaseSkills, eq(roadmapPhaseSkills.phaseId, roadmapPhases.id))
    .leftJoin(skills, eq(skills.id, roadmapPhaseSkills.skillId))
    .where(eq(roadmapPhases.roadmapId, roadmapId))
    .orderBy(asc(roadmapPhases.phase), asc(roadmapPhaseSkills.ordinal));

  const phases = new Map<string, {
    phase: number;
    title: string;
    rationale: string | null;
    estimatedWeeks: number | null;
    skills: { slug: string; name: string; gapScore: number | null }[];
  }>();

  for (const row of rows) {
    const entry = phases.get(row.phaseId) ?? {
      phase: row.phase,
      title: row.title,
      rationale: row.rationale,
      estimatedWeeks: row.estimatedWeeks,
      skills: [],
    };
    if (row.slug && row.name) {
      entry.skills.push({ slug: row.slug, name: row.name, gapScore: row.gapScore });
    }
    phases.set(row.phaseId, entry);
  }

  return { ...roadmap, phases: [...phases.values()] };
}

roadmapRoutes.get("/roadmap", async (c) => {
  const actor = requireUser(c);
  const [latest] = await db
    .select({ id: roadmaps.id })
    .from(roadmaps)
    .where(eq(roadmaps.userId, actor.id))
    .orderBy(desc(roadmaps.generatedAt))
    .limit(1);

  if (!latest) return c.json({ roadmap: null });
  return c.json({ roadmap: await readRoadmap(latest.id, actor.id) });
});

roadmapRoutes.get("/roadmap/:id", async (c) => {
  const actor = requireUser(c);
  return c.json({ roadmap: await readRoadmap(c.req.param("id"), actor.id) });
});
