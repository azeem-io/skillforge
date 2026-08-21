import { FSRS_STATE } from "@skillforge/db/schema";
import {
  createEmptyCard,
  fsrs,
  type Card as FsrsCard,
  type Grade as FsrsGrade,
} from "ts-fsrs";

/**
 * The only module in the service that imports `ts-fsrs`. Everything else goes
 * through the functions at the bottom, so replacing the algorithm changes this
 * file and nothing else.
 *
 * The unit being scheduled is a *skill*, not a flashcard: proficiency decays
 * and has to be re-earned, which is what keeps "mastered" meaning something a
 * month later.
 */

const DAY_MS = 86_400_000;

/** Identical to the ts-fsrs `Rating` values and to the `reviews_grade_range`
 *  CHECK (`grade between 1 and 4`). */
export const GRADES = [1, 2, 3, 4] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

/**
 * Recognising an answer is weaker evidence of holding a skill than producing
 * one, so a skill demonstrated only through multiple choice advances more
 * slowly than the same score on recall questions would.
 */
export const RECOGNITION_INTERVAL_MULTIPLIER = 0.7;

/** An interval at or past this is "held" — the mature-skill statistic. */
export const MATURE_INTERVAL_DAYS = 21;
/** The interval at which a skill stops being merely mature. */
export const MASTERED_INTERVAL_DAYS = 90;

/**
 * Fuzz is off deliberately, even though it is also the ts-fsrs default: with
 * fuzz on, the interval a preview promises and the interval that gets stored
 * are two different random draws.
 */
const engine = fsrs({ enable_fuzz: false });

/** A `skill_state` row, in the shape this module works with. */
export interface SchedulingState {
  due: Date;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
  state: number;
  scheduledDays: number;
  elapsedDays: number;
  learningSteps: number;
}

/** Written to `reviews.state` — the FSRS state as it was *before* the grade. */
export interface ReviewLogSnapshot {
  rating: Grade;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  review: string;
}

export interface ScheduleResult {
  next: SchedulingState;
  log: ReviewLogSnapshot;
  intervalDays: number;
  intervalMs: number;
  /** Ready to print — "10m", "3d", "2.4mo". */
  label: string;
}

function toFsrsCard(state: SchedulingState): FsrsCard {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview ?? undefined,
  };
}

function fromFsrsCard(card: FsrsCard): SchedulingState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ?? null,
    state: card.state,
    scheduledDays: card.scheduled_days,
    elapsedDays: card.elapsed_days,
    learningSteps: card.learning_steps,
  };
}

/** A skill nobody has been assessed on yet: due immediately. */
export function newSchedulingState(since: Date): SchedulingState {
  return fromFsrsCard(createEmptyCard(since));
}

/**
 * Applied to day-scale intervals only. FSRS's minute-scale learning steps are
 * short-term consolidation, not a retention estimate — shrinking 10m to 7m is
 * noise, and the recognition-is-weaker argument is about how long a memory
 * holds, not how soon to re-show something just got wrong.
 */
function applyRecognitionMultiplier(
  card: FsrsCard,
  recognitionOnly: boolean,
  reviewedAt: Date,
): FsrsCard {
  if (!recognitionOnly || card.scheduled_days < 1) return card;

  const days = Math.max(
    1,
    Math.round(card.scheduled_days * RECOGNITION_INTERVAL_MULTIPLIER),
  );
  return {
    ...card,
    scheduled_days: days,
    due: new Date(reviewedAt.getTime() + days * DAY_MS),
  };
}

export function formatInterval(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;

  // Compared after rounding, not before: 364 days is 11.96 months, which would
  // otherwise print as "12.0mo".
  const months = (days / 30.44).toFixed(1);
  if (Number(months) < 12) return `${months}mo`;

  return `${(days / 365.25).toFixed(1)}y`;
}

export function schedule(
  state: SchedulingState,
  grade: Grade,
  now: Date,
  recognitionOnly = false,
): ScheduleResult {
  const { card } = engine.next(toFsrsCard(state), now, grade as FsrsGrade);
  const adjusted = applyRecognitionMultiplier(card, recognitionOnly, now);
  const intervalMs = adjusted.due.getTime() - now.getTime();

  return {
    next: fromFsrsCard(adjusted),
    // Built from the input state rather than from the ts-fsrs `ReviewLog`,
    // whose `due` is actually `last_review || due`. The column documents
    // itself as the state at the moment of the review, so that is what goes in.
    log: {
      rating: grade,
      state: state.state,
      due: state.due.toISOString(),
      stability: state.stability,
      difficulty: state.difficulty,
      scheduledDays: state.scheduledDays,
      learningSteps: state.learningSteps,
      review: now.toISOString(),
    },
    intervalDays: Math.round(intervalMs / DAY_MS),
    intervalMs,
    label: formatInterval(intervalMs),
  };
}

export const MASTERY_LEVELS = [
  "New",
  "Learning",
  "Young",
  "Mature",
  "Mastered",
] as const;

export function masteryLevel(state: SchedulingState): number {
  if (state.state === FSRS_STATE.New) return 0;
  if (
    state.state === FSRS_STATE.Learning ||
    state.state === FSRS_STATE.Relearning
  ) {
    return 1;
  }
  if (state.scheduledDays >= MASTERED_INTERVAL_DAYS) return 4;
  if (state.scheduledDays >= MATURE_INTERVAL_DAYS) return 3;
  return 2;
}

/**
 * The bridge between a sitting and the gap calculation. `ratio` is the share
 * of a skill's questions answered correctly; the result shares the 1-5 scale
 * with `roleRequirements`, so comparing them is a subtraction.
 */
export function levelFromRatio(ratio: number): number {
  return Math.min(5, Math.max(1, Math.round(1 + ratio * 4)));
}

/** The same ratio, as the grade FSRS schedules on. */
export function gradeFromRatio(ratio: number): Grade {
  if (ratio < 0.5) return 1;
  if (ratio < 0.7) return 2;
  if (ratio < 0.9) return 3;
  return 4;
}
