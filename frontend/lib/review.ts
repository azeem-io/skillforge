import "server-only";

import { api } from "@/lib/api";
import type { Question } from "@/lib/assessment-types";

/** One skill on the FSRS schedule, as the review page lists it. */
export type DueSkill = {
  slug: string;
  name: string;
  due: string;
  reps: number;
  lapses: number;
};

export type ReviewSession = {
  questions: Question[];
  skills: DueSkill[];
  /** When nothing is due: when the next thing will be. */
  nextDue: string | null;
};

/** One skill's outcome from a graded session. */
export type ReviewOutcome = {
  slug: string;
  name: string;
  correct: number;
  total: number;
  grade: 1 | 2 | 3 | 4;
  gradeLabel: string;
  recognitionOnly: boolean;
  intervalLabel: string;
  due: string;
  lapsed: boolean;
};

export type ReviewResult = {
  results: ReviewOutcome[];
  answers: {
    questionId: string;
    isCorrect: boolean;
    response: string | null;
    answer: string | null;
    correct: number[] | null;
    explanation: string | null;
  }[];
  remaining: number;
};

export function reviewSession(limit?: number) {
  const path = "/api/skills/review/session";
  return api<ReviewSession>(limit ? `${path}?limit=${limit}` : path);
}

/** Just the count, for the dashboard nudge. Cheap enough to sit on a page
 *  that is already making several calls. */
export async function dueCount(): Promise<number> {
  try {
    const { dueNow } = await api<{ dueNow: number }>("/api/skills/progress");
    return dueNow;
  } catch {
    // A nudge that fails to load should not take the dashboard with it.
    return 0;
  }
}
