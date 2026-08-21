import type { RosterStudent } from "@/lib/student";

/**
 * Why a student is not moving, in the order a mentor can act on it.
 *
 * Only the first match is returned. Telling someone their student has no goal
 * *and* nothing demonstrated is one problem, not two, and both are fixed by the
 * same conversation — listing them separately makes the roster look worse than
 * it is and buries the students who are genuinely stuck further down.
 *
 * The overview and the roster both read this, so the two pages cannot disagree
 * about who needs attention.
 */
export type Blocker = { label: string; hint: string };

export function blockerFor(
  student: Pick<
    RosterStudent,
    "role" | "targetRoleSlug" | "demonstrated" | "readiness"
  >,
  /** False only when an admin is looking and nobody is assigned to them. */
  hasMentor: boolean,
): Blocker | null {
  // Mentors and admins have no goal and no roadmap by design, so none of the
  // rules below describe anything wrong with them.
  if (student.role !== "student") return null;

  if (!student.targetRoleSlug)
    return {
      label: "No goal",
      hint: "Nothing to measure against until they pick a target role",
    };

  if (student.demonstrated === 0)
    return {
      label: "Not started",
      hint: "Goal set, but no assessment taken and no skills claimed",
    };

  if (!hasMentor)
    return { label: "No mentor", hint: "Nobody is assigned to review them" };

  if ((student.readiness ?? 0) < QUARTER)
    return { label: "Early", hint: "Under a quarter of the way to their goal" };

  return null;
}

/**
 * Where "just starting" stops and "making progress" begins. Arbitrary, but it
 * has to live in one place: the overview counts against it and the roster
 * filters on it.
 */
const QUARTER = 25;
