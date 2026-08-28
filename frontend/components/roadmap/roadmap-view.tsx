"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Clock, MousePointerClick, Sparkles } from "lucide-react";

import { SkillGraph, type GraphSkill } from "@/components/graph/skill-graph";
import {
  ResourceLinks,
  type ResourceLink,
} from "@/components/resources/resource-links";
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

/** The phase's reading, grouped under the skill it belongs to. */
function PhaseResources({
  skills,
  resources,
}: {
  skills: { slug: string; name: string }[];
  resources: Record<string, ResourceLink[]>;
}) {
  const groups = skills
    .map((skill) => ({ skill, links: resources[skill.slug] ?? [] }))
    .filter((group) => group.links.length > 0);

  if (groups.length === 0) return null;
  const total = groups.reduce((sum, group) => sum + group.links.length, 0);

  return (
    // Collapsed by default. A phase can carry a dozen links, and a sidebar
    // that has to be scrolled past to reach phase 3 stops being a plan.
    // `<details>` rather than state: it keeps its own, and the summary is
    // already a button to a screen reader.
    <details className="group/res mt-3 border-t pt-2.5">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs [&::-webkit-details-marker]:hidden">
        <BookOpen aria-hidden className="size-3.5" />
        {total} {total === 1 ? "resource" : "resources"} for this phase
        <ChevronDown
          aria-hidden
          className="size-3.5 transition-transform group-open/res:rotate-180"
        />
      </summary>

      <div className="mt-2 space-y-2.5">
        {groups.map(({ skill, links }) => (
          <div key={skill.slug}>
            <p className="text-muted-foreground px-1.5 text-[11px] font-medium">
              {skill.name}
            </p>
            <ResourceLinks resources={links} />
          </div>
        ))}
      </div>
    </details>
  );
}

export function RoadmapView({
  skills,
  roadmap,
  resources,
}: {
  skills: GraphSkill[];
  roadmap: SavedRoadmap | null;
  /** Keyed by skill slug — see `resourcesBySkill()`. */
  resources: Record<string, ResourceLink[]>;
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
        <SkillGraph
          skills={skills}
          mode="roadmap"
          highlight={highlight}
          resources={resources}
        />
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
                <CardContent>
                  {/* Gold is reserved for model output. The phases beside it
                      are computed; this paragraph is the part a model wrote. */}
                  <p className="bg-ai-dim/30 border-ai/30 rounded-md border p-2.5 text-sm whitespace-pre-wrap">
                    <Sparkles className="text-ai mr-1.5 inline size-3.5 align-[-2px]" />
                    {roadmap.narration}
                  </p>
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
                  className={cn(
                    "transition-[border-color,box-shadow,opacity]",
                    isActive ? "border-ring shadow-md" : "hover:border-ring/50",
                    active !== null && !isActive && "opacity-50",
                  )}
                >
                  {/* The header is the control, not the whole card. The card
                      now holds links, and a role="button" wrapped around an
                      anchor is both invalid and unclickable. */}
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActive(isActive ? null : phase.phase)}
                    className="w-full cursor-pointer text-left select-none"
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
                  </button>

                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.skills.map((skill) => (
                        <Badge
                          key={skill.slug}
                          variant="outline"
                          asChild
                          className="hover:border-ring hover:bg-accent transition-colors"
                        >
                          <Link
                            href={`/graph?skill=${encodeURIComponent(skill.slug)}`}
                            title={`Open ${skill.name} in the graph`}
                          >
                            {skill.name}
                          </Link>
                        </Badge>
                      ))}
                    </div>
                    <PhaseResources
                      skills={phase.skills}
                      resources={resources}
                    />
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
