"use client";

import { useEffect, useState } from "react";

import { useReveal } from "@/components/marketing/reveal";

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Counts to `value` once the figure is on screen.
 *
 * It starts *at* the answer and only drops to zero from inside the first
 * animation frame. That ordering is the whole point: the state cannot leave
 * the true value until a frame has actually been produced, so anywhere frames
 * are not being produced — no JavaScript, a backgrounded tab, a throttled
 * renderer — the figure reads 124 rather than sitting at 0 and telling a
 * visitor the taxonomy is empty. The cost is one frame of the final number
 * before the count begins, which is 16ms and invisible; the alternative failure
 * is a headline statistic that is simply wrong.
 *
 * The reduced-motion query is checked here rather than left to CSS, because no
 * stylesheet can reach a number being set in JavaScript. The body already sets
 * `tabular-nums`, so the digits do not reflow as they climb.
 */
export function CountUp({
  value,
  duration = 1100,
}: {
  value: number;
  duration?: number;
}) {
  const { ref, shown } = useReveal<HTMLSpanElement>();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!shown) return;
    if (window.matchMedia(REDUCED).matches) return;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic: fast enough to read as a jump to roughly the right
      // number, slow enough at the end to land rather than stop.
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, value, duration]);

  return <span ref={ref}>{display}</span>;
}
