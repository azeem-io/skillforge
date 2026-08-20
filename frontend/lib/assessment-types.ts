/** Shapes skill-service returns for assessments. */

export type QuestionType = "recall" | "cloze" | "mcq";

/** As served before submission — no answer, no correct index, no explanation. */
export type Question = {
  id: string;
  ordinal: number;
  type: QuestionType;
  question: string;
  choices: string[] | null;
  difficulty: number | null;
  skillSlug: string | null;
  skillName: string | null;
};

export type AssessmentSummary = {
  slug: string;
  title: string;
  description: string | null;
  skillSlug: string;
  skillName: string;
  questionCount: number;
  best: { score: number; maxScore: number; lastAt: string } | null;
};

export type AttemptAnswer = Question & {
  questionId: string;
  correct: number[] | null;
  answer: string | null;
  explanation: string | null;
  response: string | null;
  isCorrect: boolean;
};

export type SkillBreakdown = {
  slug: string;
  name: string;
  correct: number;
  total: number;
  level: number;
};

export type AttemptResult = {
  attempt: {
    id: string;
    slug: string;
    title: string;
    startedAt: string;
    completedAt: string | null;
    score: number | null;
    maxScore: number | null;
  };
  answers: AttemptAnswer[];
  breakdown: SkillBreakdown[];
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  recall: "Recall",
  cloze: "Fill the blank",
  mcq: "Multiple choice",
};

/**
 * The same four states the graph uses, derived from a score rather than from a
 * gap. Keeping the thresholds here means the result card and the skill graph
 * cannot drift apart in what "mastered" looks like.
 */
export function masteryForRatio(
  ratio: number,
): "mastered" | "progress" | "gap" {
  if (ratio >= 0.9) return "mastered";
  if (ratio > 0) return "progress";
  return "gap";
}
