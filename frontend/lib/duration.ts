/**
 * How long a sitting took, rendered the way a stopwatch does. Shared so the
 * live timer during an assessment and the duration on its result card cannot
 * disagree about what `7:04` means.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Null rather than `0:00` when either end is missing — an attempt still in
 *  flight has no duration yet, and rendering one would be a lie. */
export function durationBetween(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? formatDuration(ms) : null;
}
