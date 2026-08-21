"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/ai/chat-composer";
import { ChatEmpty, ChatThread } from "@/components/ai/chat-thread";
import { reset, send } from "@/components/ai/chat-store";
import { useChat } from "@/components/ai/use-chat";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assistant · SkillForge" };

export default function AssistantPage() {
  const { messages, busy } = useChat();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="text-ai size-5" />
            Career assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Grounded in the knowledge base, with the analyzer behind anything
            about your own gaps.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={reset}>
            <MessageSquarePlus className="size-4" />
            New chat
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 ? (
            <ChatEmpty />
          ) : (
            <ChatThread messages={messages} />
          )}
        </div>
      </div>

      <div className="border-t px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <ChatComposer
            onSend={send}
            busy={busy}
            autoFocus
            showSuggestions={messages.length === 0}
          />
        </div>
      </div>
    </div>
  );
}
