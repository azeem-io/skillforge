import { env } from "./context";

/**
 * The prose half of a roadmap. Structure is computed — by python-analyzer when
 * it answers, by `phases()` in packages/db when it does not — and this asks
 * ai-service to describe what was computed. A model never decides ordering;
 * see the roadmap rules in CLAUDE.md.
 */
export type NarrationRequest = {
  role: string;
  readiness: number;
  phases: {
    phase: number;
    title: string;
    estimatedWeeks: number | null;
    skills: string[];
  }[];
  strengths: string[];
};

export type Narration = {
  narration: string | null;
  /** Phase number to rationale. Phases the model skipped are simply absent. */
  rationales: Record<number, string>;
};

/**
 * Longer than the analyzer's budget because this one waits on a model. Still
 * bounded: a roadmap with no prose is a roadmap, and a request that never
 * returns is not.
 */
const TIMEOUT_MS = 20_000;

/**
 * Null whenever ai-service cannot answer — unconfigured, unreachable, out of
 * quota, or holding a reply longer than a student should wait. The columns
 * stay null and the roadmap saves anyway.
 */
export async function requestNarration(
  input: NarrationRequest,
): Promise<Narration | null> {
  if (!env.aiServiceUrl) return null;

  try {
    const response = await fetch(new URL("/narrate", env.aiServiceUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      narration?: string;
      rationales?: { phase?: number; rationale?: string }[];
    };

    const rationales: Record<number, string> = {};
    for (const row of data.rationales ?? []) {
      if (typeof row?.phase === "number" && row.rationale) {
        rationales[row.phase] = row.rationale;
      }
    }

    return { narration: data.narration?.trim() || null, rationales };
  } catch {
    return null;
  }
}
