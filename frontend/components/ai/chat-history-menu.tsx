"use client";

import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearThreads, switchTo, type Thread } from "./chat-store";

function relativeTime(ts: number) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round((ts - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/** The "New chat" button archives instead of discarding — this is where an
 * archived thread comes back from. */
export function ChatHistoryMenu({ threads }: { threads: Thread[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={threads.length === 0}
          aria-label="Past conversations"
          title="Past conversations"
        >
          <History className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Past conversations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {threads.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => switchTo(t.id)}>
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {relativeTime(t.updatedAt)}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => clearThreads()}>
          Clear history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
