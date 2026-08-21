"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { ChatComposer } from "./chat-composer";
import { send } from "./chat-store";
import { useChat } from "./use-chat";

/**
 * The dashboard's way in. Asking here starts the turn and moves the student to
 * the assistant page, so the answer lands in the conversation rather than in a
 * card they then have to leave behind.
 */
export function DashboardAsk() {
  const router = useRouter();
  const { busy, messages } = useChat();

  function ask(text: string) {
    send(text);
    router.push("/assistant");
  }

  return (
    <Card className="border-ai/40">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 font-medium">
            <Sparkles className="text-ai size-4" />
            Ask the career assistant
          </h2>
          <Link
            href="/assistant"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            {messages.length > 0 ? "Continue chat" : "Open assistant"}
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <ChatComposer onSend={ask} busy={busy} showSuggestions />
      </CardContent>
    </Card>
  );
}
