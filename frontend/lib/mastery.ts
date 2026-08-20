export type Mastery = "mastered" | "progress" | "gap" | "locked";

export const MASTERY_LABEL: Record<Mastery, string> = {
  mastered: "Mastered",
  progress: "In progress",
  gap: "Gap",
  locked: "Locked",
};

export const MASTERY_DESCRIPTION: Record<Mastery, string> = {
  mastered: "At or above the level your goal requires",
  progress: "Some evidence, below the required level",
  gap: "Required by your goal, no evidence yet",
  locked: "Prerequisites not met yet",
};

// Tailwind cannot see dynamically built class names, so every variant is
// written out in full.
export const MASTERY_CHIP: Record<Mastery, string> = {
  mastered: "bg-mastery-mastered-bg text-mastery-mastered-fg",
  progress: "bg-mastery-progress-bg text-mastery-progress-fg",
  gap: "bg-mastery-gap-bg text-mastery-gap-fg",
  locked: "bg-mastery-locked-bg text-mastery-locked-fg",
};

export const MASTERY_DOT: Record<Mastery, string> = {
  mastered: "bg-mastery-mastered-ring",
  progress: "bg-mastery-progress-ring",
  gap: "bg-mastery-gap-ring",
  locked: "bg-mastery-locked-ring",
};

export const MASTERY_NODE: Record<Mastery, string> = {
  mastered:
    "bg-mastery-mastered-bg text-mastery-mastered-fg border-mastery-mastered-ring",
  progress:
    "bg-mastery-progress-bg text-mastery-progress-fg border-mastery-progress-ring",
  gap: "bg-mastery-gap-bg text-mastery-gap-fg border-mastery-gap-ring",
  locked:
    "bg-mastery-locked-bg text-mastery-locked-fg border-mastery-locked-ring",
};

export const MASTERY_CIRCLE: Record<Mastery, string> = {
  mastered: "fill-mastery-mastered-bg stroke-mastery-mastered-ring",
  progress: "fill-mastery-progress-bg stroke-mastery-progress-ring",
  gap: "fill-mastery-gap-bg stroke-mastery-gap-ring",
  locked: "fill-mastery-locked-bg stroke-mastery-locked-ring",
};

export const MASTERY_TEXT: Record<Mastery, string> = {
  mastered: "fill-mastery-mastered-fg",
  progress: "fill-mastery-progress-fg",
  gap: "fill-mastery-gap-fg",
  locked: "fill-mastery-locked-fg",
};
