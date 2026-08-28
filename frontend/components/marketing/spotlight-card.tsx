"use client";

import { useCallback, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * A card that lights where the pointer is. The position is written to two CSS
 * custom properties and the gradient is painted by CSS, so a move costs one
 * style write and no React render.
 *
 * Pointer-only by nature: on touch nothing writes the variables and the card
 * stays exactly as it looks at rest.
 */
export function SpotlightCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--mx",
      `${event.clientX - rect.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--my",
      `${event.clientY - rect.top}px`,
    );
  }, []);

  return (
    <Tag
      onPointerMove={onPointerMove}
      className={cn(
        "spotlight bg-card hover:border-border-strong/50 relative isolate overflow-hidden rounded-xl border shadow-xs",
        "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-md",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
