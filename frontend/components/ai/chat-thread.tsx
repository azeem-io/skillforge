"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Answer } from "./answer";
import type { Message } from "./chat-store";

function Sources({ message }: { message: Message }) {
  const [active, setActive] = useState<number | null>(null);
  const sources = message.sources ?? [];
  const steps = message.steps ?? [];

  return (
    <>
      <div className="bg-ai-dim/30 border-ai/30 rounded-md border p-3.5">
        <Answer
          markdown={message.content}
          activeCitation={active}
          onCitation={setActive}
        />
      </div>

      {steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Tools called</span>
          {steps.map((s, i) => (
            <span
              key={`${s.tool}-${i}`}
              className="bg-secondary rounded px-1.5 py-0.5 font-mono text-[11px]"
            >
              {s.tool}
            </span>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <ul className="space-y-1">
          {sources.map((s, i) => (
            <li key={s.source}>
              <button
                type="button"
                onMouseEnter={() => setActive(i + 1)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i + 1)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  active === i + 1
                    ? "border-ai bg-ai-dim/40"
                    : "hover:border-ai/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] leading-none font-semibold tabular-nums",
                    active === i + 1
                      ? "bg-ai text-ai-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{s.source}</span>
                <span className="text-muted-foreground tabular-nums">
                  {s.relevance.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ChatThread({
  messages,
  compact = false,
}: {
  messages: Message[];
  compact?: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows. Instant rather than smooth on the
  // first paint would jump; smooth is fine because the global reduced-motion
  // block neutralises it for anyone who asked.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className={cn("space-y-5", compact ? "text-sm" : "")}>
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <p className="bg-secondary text-secondary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap">
              {m.content}
            </p>
          </div>
        ) : (
          <div key={m.id} className="space-y-2">
            {m.pending ? (
              <div className="bg-ai-dim/20 border-ai/20 text-muted-foreground flex items-center gap-2 rounded-md border p-3.5 text-sm">
                <Loader2 className="text-ai size-3.5 animate-spin" />
                Working through your skill graph…
              </div>
            ) : m.failed ? (
              <div className="border-destructive/40 bg-destructive/10 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                <span>{m.content}</span>
              </div>
            ) : (
              <Sources message={m} />
            )}
          </div>
        ),
      )}
      <div ref={end} />
    </div>
  );
}

export function ChatEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("text-muted-foreground", compact ? "text-sm" : "")}>
      <Sparkles className="text-ai mb-2 size-5" />
      <p className="text-foreground font-medium">Ask about your path</p>
      <p className="mt-1 max-w-md text-sm">
        Answers are grounded in the knowledge base and cite their sources. For
        anything about your own gaps or roadmap, the assistant calls the
        analyzer rather than guessing.
      </p>
    </div>
  );
}
