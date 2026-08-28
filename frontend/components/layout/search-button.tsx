"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The palette's visible half. A shortcut nobody can see is a shortcut nobody
 * uses, so the key that opens it is printed on the control that opens it.
 */
export function SearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpen}
      className="text-muted-foreground w-full max-w-64 justify-start gap-2 font-normal"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="bg-muted ml-auto hidden items-center rounded border px-1.5 font-mono text-[10px] sm:inline-flex">
        ⌘K
      </kbd>
    </Button>
  );
}
