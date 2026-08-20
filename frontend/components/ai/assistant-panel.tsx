"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Source = { source: string; relevance: number };
type Step = { tool: string };

const SUGGESTED = [
  "What goal should I choose based on my skills?",
  "Should I learn React before JavaScript?",
  "Why is my roadmap ordered this way?",
];

// Questions that need real numbers go to the agent, which can call the
// analyzer. Everything else takes the one-shot RAG path, which is far quicker.
const NEEDS_TOOLS =
  /\b(goal|role|career|switch|readiness|ready|gap|missing|roadmap|how long|weeks|next|compare|instead)\b/i;

export function AssistantPanel({ role }: { role?: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    setSteps([]);

    const agentic = NEEDS_TOOLS.test(q);

    try {
      const response = await fetch(agentic ? "/ai/agent" : "/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, role }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.hint ?? data.error ?? "Request failed.");
        return;
      }
      setAnswer(data.answer);
      setSources(data.sources ?? []);
      setSteps(data.steps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-ai/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-ai size-4" />
          AI career assistant
        </CardTitle>
        <CardDescription>
          Answers are grounded in the knowledge base and cite their sources.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about what to learn next…"
            aria-label="Ask the career assistant"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>

        {!answer && !error && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
                className="text-muted-foreground hover:bg-accent rounded-md border px-2 py-1 text-xs"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-3.5 animate-spin" />
            Working through your skill graph…
          </p>
        )}

        {error && (
          <div className="border-destructive/40 bg-destructive/10 rounded-md border px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {answer && (
          <div className="space-y-3">
            <div className="bg-ai-dim/30 border-ai/30 rounded-md border p-3 text-sm whitespace-pre-wrap">
              {answer}
            </div>
            {steps.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  Tools called
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {steps.map((s, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {s.tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  Retrieved sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((s, i) => (
                    <Badge key={s.source} variant="outline" className="text-xs">
                      [{i + 1}] {s.source} · {s.relevance.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
