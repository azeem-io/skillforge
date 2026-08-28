"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Reveals its children the first time they scroll into view, then stops
 * watching. Once, deliberately — content that re-animates every time it
 * crosses the fold is the thing that makes a page feel cheap on the second
 * scroll past.
 *
 * The hidden state lives in CSS behind a `.js` gate rather than in this
 * component's markup, so a visitor without JavaScript is served the finished
 * page instead of an empty one.
 */
export function useReveal<T extends HTMLElement>(rootMargin = "-12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;

    // No observer means no way to know when this crosses the fold, and the
    // `.js` class has already hidden it — so reveal on the next frame rather
    // than leaving a visitor staring at nothing.
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);

    // Insurance, not logic. The observer is what should reveal this, but the
    // cost of it not firing — a permanently blank section — is far worse than
    // the cost of revealing something a beat early, so nothing stays hidden
    // for longer than this no matter what.
    const failsafe = setTimeout(() => setShown(true), 1400);

    return () => {
      observer.disconnect();
      clearTimeout(failsafe);
    };
  }, [rootMargin, shown]);

  return { ref, shown };
}

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Milliseconds. Stagger a group by passing an index times a step. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "p" | "h2";
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      data-shown={shown}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** The hero headline, arriving a word at a time. Split here rather than in the
 *  page so the markup stays one readable string at the call site. */
export function WordReveal({
  text,
  className,
  highlight,
  highlightClassName,
}: {
  text: string;
  className?: string;
  /** Rendered after `text`, continuing the same stagger. */
  highlight?: string;
  highlightClassName?: string;
}) {
  const words = text.split(" ");
  const highlighted = highlight ? highlight.split(" ") : [];

  return (
    <span className={cn("word-in", className)}>
      {/* Each space is a text node *between* the animated spans, never inside
          one: trailing whitespace at the end of an inline-block is collapsed
          away, which would run every word into the next. */}
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="word" style={{ "--i": i } as React.CSSProperties}>
            {word}
          </span>{" "}
        </span>
      ))}
      {highlighted.length > 0 && (
        // The gradient sits on this wrapper rather than on each word, so it
        // ramps once across the whole phrase instead of restarting per word.
        <span className={highlightClassName}>
          {highlighted.map((word, i) => (
            <span key={`h-${word}-${i}`}>
              <span
                className="word"
                style={{ "--i": words.length + i } as React.CSSProperties}
              >
                {word}
              </span>
              {i < highlighted.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
