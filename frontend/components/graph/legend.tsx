"use client";

import { MASTERY_DOT, MASTERY_LABEL, type Mastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

/** One low horizontal strip shared by every graph view. */
export function Legend({
  counts,
  className,
  children,
}: {
  counts?: Partial<Record<Mastery, number>>;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card/85 absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3.5 rounded-full border px-3.5 py-1.5 text-[11px] whitespace-nowrap shadow-xs backdrop-blur",
        className,
      )}
    >
      {ORDER.map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", MASTERY_DOT[m])} />
          <span className="text-muted-foreground">{MASTERY_LABEL[m]}</span>
          {counts?.[m] !== undefined && (
            <span className="font-mono font-medium">{counts[m]}</span>
          )}
        </span>
      ))}
      {children}
    </div>
  );
}
