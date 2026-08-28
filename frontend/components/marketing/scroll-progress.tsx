"use client";

import { useEffect, useRef } from "react";

/**
 * A hairline across the top that fills as the page is read, plus the class
 * that thickens the header's blur once it has left the top.
 *
 * Written straight to the DOM from a passive scroll listener rather than
 * through state: this fires on every frame of a scroll, and a React render per
 * frame is exactly the thing that makes a landing page feel heavy. Both writes
 * are transform and opacity only.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = document.getElementById("site-header");

    let frame = 0;
    const update = () => {
      frame = 0;
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, scrolled / max) : 0;

      if (bar.current) {
        bar.current.style.transform = `scaleX(${progress})`;
      }
      header?.toggleAttribute("data-scrolled", scrolled > 8);
    };

    const onScroll = () => {
      // Coalesced to one write per frame; a scroll can fire far more often.
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <div
        ref={bar}
        className="from-teal-500 to-ai h-full origin-left bg-linear-to-r"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
