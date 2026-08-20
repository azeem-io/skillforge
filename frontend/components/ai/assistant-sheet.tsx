"use client";

import Link from "next/link";
import { Maximize2, MessageSquarePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChatComposer } from "./chat-composer";
import { ChatEmpty, ChatThread } from "./chat-thread";
import { reset, send, setOpen } from "./chat-store";
import { useChat } from "./use-chat";

export function AssistantSheet() {
  const { messages, busy, open } = useChat();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Sparkles className="text-ai size-4" />
          <span className="hidden sm:inline">Assistant</span>
          {busy && (
            <span
              className="bg-ai size-1.5 animate-pulse rounded-full"
              aria-hidden
            />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <div className="flex items-start justify-between gap-2 border-b p-4">
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="text-ai size-4" />
              Career assistant
            </SheetTitle>
            <SheetDescription className="text-xs">
              Same conversation as the assistant page.
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                aria-label="Start a new chat"
                title="Start a new chat"
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Open the full assistant page"
              title="Open the full page"
            >
              <Link href="/assistant" onClick={() => setOpen(false)}>
                <Maximize2 className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <ChatEmpty compact />
          ) : (
            <ChatThread messages={messages} compact />
          )}
        </div>

        <div className="border-t p-4">
          <ChatComposer
            onSend={send}
            busy={busy}
            showSuggestions={messages.length === 0}
            placeholder="Ask anything…"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
