export type QuestionType = "recall" | "cloze" | "mcq";

export type GradableQuestion = {
  id: string;
  type: QuestionType;
  answer: string | null;
  correct: number[] | null;
  skillId: string | null;
  difficulty: number | null;
};

/**
 * Case, punctuation and surrounding whitespace are noise in a typed answer —
 * "F1 score", "f1-score" and "F1" are the same knowledge. Internal whitespace
 * collapses so "inner  join" matches "inner join".
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `answer` may list several acceptable responses separated by `|`. That is the
 * whole tolerance mechanism: a free-text question whose answer cannot be
 * written as a short list of accepted strings does not belong in the bank.
 */
export function isCorrect(question: GradableQuestion, response: string): boolean {
  if (question.type === "mcq") {
    const expected = new Set(question.correct ?? []);
    const given = new Set(
      response
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((n) => Number.isInteger(n)),
    );
    if (expected.size !== given.size) return false;
    for (const index of expected) if (!given.has(index)) return false;
    return true;
  }

  if (!question.answer) return false;
  const given = normalize(response);
  if (!given) return false;

  return question.answer
    .split("|")
    .map(normalize)
    .some((accepted) => accepted === given);
}

export type SkillOutcome = {
  skillId: string;
  correct: number;
  total: number;
  ratio: number;
  /** True when every question for this skill was multiple choice. */
  recognitionOnly: boolean;
};

/**
 * Groups the graded answers by the skill each question was tagged with. This
 * is what turns one sitting into a per-skill breakdown rather than one score —
 * questions carry a finer-grained skill than the assessment itself.
 */
export function outcomesBySkill(
  graded: { question: GradableQuestion; isCorrect: boolean }[],
): SkillOutcome[] {
  const bySkill = new Map<string, { correct: number; total: number; mcqOnly: boolean }>();

  for (const { question, isCorrect: right } of graded) {
    if (!question.skillId) continue;
    const entry = bySkill.get(question.skillId) ?? {
      correct: 0,
      total: 0,
      mcqOnly: true,
    };
    entry.total += 1;
    if (right) entry.correct += 1;
    if (question.type !== "mcq") entry.mcqOnly = false;
    bySkill.set(question.skillId, entry);
  }

  return [...bySkill].map(([skillId, entry]) => ({
    skillId,
    correct: entry.correct,
    total: entry.total,
    ratio: entry.total ? entry.correct / entry.total : 0,
    recognitionOnly: entry.mcqOnly,
  }));
}
