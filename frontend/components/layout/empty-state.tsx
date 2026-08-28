import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One shape for "there is nothing here yet". Before this the app had three
 * idioms — a bare muted paragraph, a Card with a header, and a Card with an
 * icon row — which made an empty profile and an empty roster look like
 * different kinds of event. They are the same event.
 *
 * Always says what would put something here, not just that nothing is. An
 * empty state with no next step reads as a failure.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Inline within a section that already has its own heading. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/70 flex flex-col items-center rounded-lg border border-dashed text-center",
        compact ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-10",
        className,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            "text-muted-foreground/70",
            compact ? "size-5" : "size-6",
          )}
        />
      )}
      <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {children && (
        <p className="text-muted-foreground max-w-prose text-sm text-balance">
          {children}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
