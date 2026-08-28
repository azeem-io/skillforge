import "server-only";

import { api } from "@/lib/api";
import type {
  AssessmentSummary,
  AttemptResult,
  AttemptSummary,
} from "@/lib/assessment-types";
import { me, roleGraph } from "@/lib/student";

export type Turn = { role: "user" | "assistant"; content: string };

/** One sitting as the assistant sees it: what was scored, and where it broke. */
export type AssessmentRecap = {
  slug: string;
  title: string;
  score: number | null;
  maxScore: number | null;
  completedAt: string | null;
  weakest?: { name: string; correct: number; total: number }[];
};

/** Every assessment that exists, not just ones this student has sat — so the
 *  assistant can link one without a slug list hardcoded in ai-service. */
export type AssessmentCatalogEntry = { slug: string; title: string };

/** Rides on every message, so: three sittings, and one breakdown for the last. */
const RECENT_ATTEMPTS = 3;
const WEAKEST_SKILLS = 3;

/**
 * What the assistant is allowed to know about who it is talking to. Assembled
 * here rather than accepted from the browser: the client has no business
 * asserting what a student has demonstrated, and the analyzer payload is around
 * 20KB of taxonomy nobody should be uploading on every message.
 */
export async function assistantStudent() {
  const profile = await me();
  if (!profile) {
    return {
      roleSlug: null,
      demonstrated: {} as Record<string, number>,
      recentAssessments: [] as AssessmentRecap[],
      availableAssessments: await assessmentCatalog(),
    };
  }

  const roleSlug = profile.targetRoleSlug;
  const [demonstrated, recentAssessments, availableAssessments] = await Promise.all([
    roleSlug ? demonstratedFor(roleSlug) : {},
    recentAttempts(),
    assessmentCatalog(),
  ]);
  return { roleSlug, demonstrated, recentAssessments, availableAssessments };
}

/**
 * The full catalog, slug and title only — what the assistant is allowed to
 * link to. Fetched fresh per request rather than duplicated as a constant, so
 * it can never drift from what `/assessments` actually offers.
 */
async function assessmentCatalog(): Promise<AssessmentCatalogEntry[]> {
  try {
    const { assessments } = await api<{ assessments: AssessmentSummary[] }>(
      "/api/skills/assessments",
    );
    return assessments.map(({ slug, title }) => ({ slug, title }));
  } catch {
    // An assistant that can't link an assessment beats one that 500s over it.
    return [];
  }
}

async function demonstratedFor(roleSlug: string) {
  const { skills } = await roleGraph(roleSlug);
  const demonstrated: Record<string, number> = {};
  for (const skill of skills) {
    if (skill.level > 0) demonstrated[skill.slug] = skill.level;
  }
  return demonstrated;
}

/**
 * A level says where a student is; an attempt says what just happened. Without
 * this the assistant answers "how did I do?" from levels alone, unable to tell
 * a test taken five minutes ago from a claim typed three weeks ago.
 *
 * The questions and explanations stay behind `/api/skills` — only the score and
 * the worst few skills of the latest sitting travel into the prompt.
 */
async function recentAttempts(): Promise<AssessmentRecap[]> {
  try {
    const { attempts } = await api<{ attempts: AttemptSummary[] }>(
      "/api/skills/attempts",
    );
    const completed = attempts
      .filter((attempt) => attempt.completedAt)
      .slice(0, RECENT_ATTEMPTS);
    if (completed.length === 0) return [];

    const recaps: AssessmentRecap[] = completed.map((attempt) => ({
      slug: attempt.slug,
      title: attempt.title,
      score: attempt.score,
      maxScore: attempt.maxScore,
      completedAt: attempt.completedAt,
    }));

    const { result } = await api<{ result: AttemptResult }>(
      `/api/skills/attempts/${completed[0].id}`,
    );
    // breakdown arrives sorted worst-first.
    recaps[0].weakest = result.breakdown
      .slice(0, WEAKEST_SKILLS)
      .map(({ name, correct, total }) => ({ name, correct, total }));

    return recaps;
  } catch {
    // An assistant that answers without the history beats one that 500s with it.
    return [];
  }
}

/**
 * The taxonomy the agent's tools reason over: leaves, prerequisite edges, every
 * role's requirements, and what this student has demonstrated. Roughly 20KB, so
 * it is fetched per agent turn and never sent from the browser.
 */
export type AnalyzerContext = {
  skills: { slug: string; name: string }[];
  edges: { skill: string; prerequisite: string }[];
  demonstrated: Record<string, number>;
  target_role: string | null;
  requirements: { skill: string; required_level: number; weight: number }[];
  roles: {
    slug: string;
    name: string;
    requirements: { skill: string; required_level: number; weight: number }[];
  }[];
};

async function analyzerContext(roleSlug?: string | null) {
  const path = "/api/skills/analyzer-context";
  return api<AnalyzerContext>(
    roleSlug ? `${path}?role=${encodeURIComponent(roleSlug)}` : path,
  );
}

/**
 * What the Career Planning Agent is sent. Narrower than `assistantStudent()`
 * on purpose: the agent reads the taxonomy through its tools, so it gets the
 * analyzer payload instead of a demonstrated map, and never the assessment
 * catalog — it has `get_assessment_history` for that.
 */
export async function agentStudent() {
  const profile = await me();
  const [context, recentAssessments] = await Promise.all([
    analyzerContext(profile?.targetRoleSlug),
    recentAttempts(),
  ]);
  return { context, recentAssessments };
}

/** Trimmed to the text turns; tool-call frames stay server-side. */
export function historyFrom(body: unknown): Turn[] {
  const raw = (body as { history?: unknown })?.history;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is Turn =>
        !!t &&
        typeof (t as Turn).content === "string" &&
        ((t as Turn).role === "user" || (t as Turn).role === "assistant"),
    )
    .slice(-10)
    .map((t) => ({ role: t.role, content: t.content }));
}
