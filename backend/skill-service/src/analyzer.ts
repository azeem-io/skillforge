import type { SkillRow } from "@skillforge/db";

import { env } from "./context";

/**
 * The contract with python-analyzer. Written down here because the service
 * does not exist yet — Azeem owns it, and this is the shape `RoadmapGenerator`
 * has to return for the roadmap to persist without changing anything below.
 *
 * `phase` is a rank of the topological sort: skills sharing one can be learned
 * in parallel. Ordering is the analyzer's to decide, never a model's.
 */
export type AnalyzerPhase = {
  phase: number;
  title?: string;
  rationale?: string;
  estimatedWeeks?: number;
  skills: { slug: string; ordinal?: number; gapScore?: number }[];
};

export type AnalyzerRoadmap = {
  phases: AnalyzerPhase[];
  readinessScore?: number;
  narration?: string;
};

/** Long enough for a cold FastAPI worker, short enough that a dead analyzer
 *  does not hold a student's request open. */
const TIMEOUT_MS = 4000;

/**
 * Returns null rather than throwing whenever the analyzer cannot answer, which
 * is the signal for the caller to fall back to the local layering. The two
 * cases are not distinguished on purpose: "not deployed yet" and "crashed"
 * both mean the same thing to a student waiting for a roadmap.
 */
export async function requestRoadmap(
  role: { slug: string; name: string },
  skills: SkillRow[],
): Promise<AnalyzerRoadmap | null> {
  if (!env.pythonAnalyzerUrl) return null;

  try {
    const response = await fetch(new URL("/roadmap", env.pythonAnalyzerUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, skills }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as AnalyzerRoadmap;
    if (!Array.isArray(data.phases) || data.phases.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}
