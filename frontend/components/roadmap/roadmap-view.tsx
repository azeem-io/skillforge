"use client";

import { useMemo, useState } from "react";
import { Clock, MousePointerClick, Sparkles } from "lucide-react";

import { SkillGraph, type GraphSkill } from "@/components/graph/skill-graph";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SavedRoadmap } from "@/lib/student";
import { cn } from "@/lib/utils";

export function RoadmapView({
  skills,
  roadmap,
}: {
  skills: GraphSkill[];
  roadmap: SavedRoadmap | null;
}) {
  const [active, setActive] = useState<number | null>(null);

  const highlight = useMemo(() => {
    if (!roadmap || active === null) return null;
    const phase = roadmap.phases.find((p) => p.phase === active);
    return phase ? phase.skills.map((s) => s.slug) : null;
  }, [roadmap, active]);

  return (
    <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_24rem]">
      <div className="h-[55vh] lg:h-auto">
        <SkillGraph skills={skills} mode="roadmap" highlight={highlight} />
      </div>

      <aside className="space-y-3 overflow-auto border-t p-4 lg:border-t-0 lg:border-l">
        {!roadmap && (
          <Card className="border-ring/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="text-ai size-4" />
                No saved roadmap yet
              </CardTitle>
              <CardDescription>
                The graph beside this is computed live. Generating saves an
                ordered plan with effort estimates, and freezes your readiness
                at that moment so the next one shows movement.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {roadmap && (
          <>
            <Card className="bg-muted/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {roadmap.roleName}
                  </CardTitle>
                  {roadmap.readinessScore !== null && (
                    <Badge variant="secondary" className="font-mono">
                      {roadmap.readinessScore}% ready
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Generated{" "}
                  {new Date(roadmap.generatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </CardDescription>
              </CardHeader>
              {roadmap.narration && (
                <CardContent className="text-sm whitespace-pre-wrap">
                  {roadmap.narration}
                </CardContent>
              )}
            </Card>

            <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs">
              <MousePointerClick className="size-3.5" />
              Click a phase to spotlight it in the graph. Click again to zoom
              back out.
            </p>

            {roadmap.phases.map((phase) => {
              const isActive = active === phase.phase;
              return (
                <Card
                  key={phase.phase}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActive(isActive ? null : phase.phase)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(isActive ? null : phase.phase);
                    }
                  }}
                  className={cn(
                    "cursor-pointer transition-[border-color,box-shadow,opacity] select-none",
                    isActive
                      ? "border-ring shadow-md"
                      : "hover:border-ring/50",
                    active !== null && !isActive && "opacity-50",
                  )}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {phase.phase}. {phase.title}
                      </CardTitle>
                      {phase.estimatedWeeks !== null && (
                        <Badge variant="secondary">
                          ~{phase.estimatedWeeks}w
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {phase.rationale ??
                        (phase.phase === 1
                          ? "Nothing blocks these — start anywhere here."
                          : `Unlocked once phase ${phase.phase - 1} lands.`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {phase.skills.map((skill) => (
                      <Badge key={skill.slug} variant="outline">
                        {skill.name}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </aside>
    </div>
  );
}
