"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SUGGESTIONS } from "./chat-store";

export function ChatComposer({
  onSend,
  busy = false,
  placeholder = "Ask about what to learn next…",
  showSuggestions = false,
  autoFocus = false,
  className,
}: {
  onSend: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    setValue("");
    onSend(text);
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Message the career assistant"
          autoFocus={autoFocus}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !value.trim()}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </form>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onSend(s)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
