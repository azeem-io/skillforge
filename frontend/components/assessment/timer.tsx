"use client";

import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";

import { formatDuration } from "@/lib/duration";

/**
 * Elapsed time for a sitting, counted from the server's `started_at` rather
 * than from mount — a refresh mid-assessment must not reset it, and the number
 * shown has to be the number the result card will report afterwards.
 *
 * Deliberately not a countdown: nothing here is timed, and a deadline would
 * change what the score measures. It is a stopwatch a student can ignore.
 */
export function AttemptTimer({ startedAt }: { startedAt: string }) {
  const started = new Date(startedAt).getTime();
  // Rendered empty on the server and on the first client paint: the elapsed
  // time differs between the two, and hydration would flag the mismatch.
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(started)) return;
    const tick = () => setElapsed(Date.now() - started);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started]);

  return (
    <p
      className="text-muted-foreground flex items-center gap-1.5 font-mono text-sm tabular-nums"
      aria-label="Time elapsed"
    >
      <TimerIcon aria-hidden className="size-3.5" />
      <span suppressHydrationWarning>
        {elapsed === null ? "—:—" : formatDuration(elapsed)}
      </span>
    </p>
  );
}
