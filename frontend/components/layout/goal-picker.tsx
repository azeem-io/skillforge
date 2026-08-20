"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setTargetRole } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Role = { slug: string; name: string; summary: string | null };

export function GoalPicker({ options }: { options: Role[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function choose(slug: string) {
    setChosen(slug);
    start(async () => {
      await setTargetRole(slug);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="text-muted-foreground size-4" />
            Choose a career goal
          </CardTitle>
          <CardDescription>
            Your roadmap is the gap between where you are and what this role
            asks for. Pick the one you are aiming at — you can change it later,
            and nothing you learn is wasted if you do.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
          {options.map((role) => (
            <button
              key={role.slug}
              type="button"
              disabled={pending}
              onClick={() => choose(role.slug)}
              className={cn(
                "hover:border-ring rounded-lg border p-4 text-left transition-colors",
                chosen === role.slug && "border-ring bg-accent",
                pending && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{role.name}</span>
                {pending && chosen === role.slug && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
              </div>
              {role.summary && (
                <p className="text-muted-foreground mt-1 text-xs leading-snug">
                  {role.summary}
                </p>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        Not sure? Pick the closest one — the assistant can compare all four
        against your skills once you have taken an assessment.
      </p>
    </div>
  );
}
