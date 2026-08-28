"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { setTargetRole } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** python-analyzer's `RoleComparison`, snake_case as it comes off the wire. */
export type RoleScore = {
  slug: string;
  name: string;
  readiness_score: number;
  mastered: number;
  in_progress: number;
  requirements: number;
  skills_remaining: number;
  total_weeks: number;
  first_phase: string[];
};

/**
 * `compare_target_roles` has been scoring every role since the agent shipped,
 * but only inside an answer nobody could see the working of. This is the same
 * call with the numbers on screen.
 *
 * Sorted by the analyzer, not here: readiness first, then fewest skills
 * remaining. Re-sorting client-side would be a second opinion.
 */
export function RoleComparison({
  roles,
  current,
  summaries,
}: {
  roles: RoleScore[];
  current: string;
  summaries: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(slug: string) {
    start(async () => {
      await setTargetRole(slug);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {roles.map((role) => {
        const isCurrent = role.slug === current;
        return (
          <Card
            key={role.slug}
            className={cn("flex flex-col", isCurrent && "border-ring/60")}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="truncate">{role.name}</span>
                    {isCurrent && (
                      <Badge variant="secondary" className="shrink-0">
                        <Target className="size-3" /> Your goal
                      </Badge>
                    )}
                  </CardTitle>
                  {summaries[role.slug] && (
                    <p className="text-muted-foreground mt-1 text-xs leading-snug">
                      {summaries[role.slug]}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-right font-mono text-2xl font-semibold tracking-tight">
                  {role.readiness_score}
                  <span className="text-muted-foreground text-base">%</span>
                </p>
              </div>
            </CardHeader>

            <CardContent className="mt-auto space-y-3">
              <Progress value={role.readiness_score} />

              <dl className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Mastered" value={`${role.mastered}/${role.requirements}`} />
                <Stat label="To learn" value={role.skills_remaining} />
                <Stat label="Weeks" value={role.total_weeks} />
              </dl>

              {role.first_phase.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">
                    {/* The honest headline number: a role can look far off on
                        readiness and still be startable tomorrow. */}
                    Startable today
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.first_phase.slice(0, 5).map((name) => (
                      <Badge key={name} variant="outline" className="font-normal">
                        {name}
                      </Badge>
                    ))}
                    {role.first_phase.length > 5 && (
                      <Badge variant="outline" className="font-normal">
                        +{role.first_phase.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {isCurrent ? (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/roadmap">
                    Open roadmap <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => choose(role.slug)}
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Make this my goal
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded-md px-2 py-1.5">
      <dd className="font-mono text-sm font-medium">{value}</dd>
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
    </div>
  );
}
