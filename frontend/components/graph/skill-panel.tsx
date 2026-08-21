"use client";

import { Loader2, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_BAR } from "@/lib/category";
import {
  MASTERY_CHIP,
  MASTERY_DESCRIPTION,
  MASTERY_DOT,
  MASTERY_LABEL,
} from "@/lib/mastery";
import { cn } from "@/lib/utils";
import type { GraphSkill } from "./skill-graph";

function SkillChips({
  title,
  skills,
  onSelect,
}: {
  title: string;
  skills: GraphSkill[];
  onSelect: (id: string) => void;
}) {
  if (skills.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
          >
            <span className={cn("size-2 rounded-full", MASTERY_DOT[s.mastery])} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SkillPanel({
  skill,
  categoryIndex,
  prerequisites,
  unlocks,
  expanding,
  onSelect,
  onExpand,
  onClose,
}: {
  skill: GraphSkill;
  categoryIndex: number;
  prerequisites: GraphSkill[];
  unlocks: GraphSkill[];
  expanding: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-card/95 absolute top-3 right-3 bottom-3 z-10 flex w-80 flex-col overflow-hidden rounded-lg border shadow-lg backdrop-blur">
      <div className="flex items-start gap-2.5 border-b p-4">
        <span
          className={cn(
            "mt-0.5 h-8 w-1 shrink-0 rounded-full",
            CATEGORY_BAR[categoryIndex],
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-tight font-semibold">{skill.name}</h2>
          <p className="text-muted-foreground text-xs">
            {skill.category}
            {skill.subcategory && ` · ${skill.subcategory}`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground -m-1 p-1"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        {skill.aiGenerated ? (
          <p className="bg-ai-dim/30 border-ai/30 text-muted-foreground rounded-md border p-2.5 text-xs">
            <Sparkles className="text-ai mr-1 inline size-3" />
            Suggested by the model as a sub-skill. Not part of the curated
            taxonomy yet.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  MASTERY_CHIP[skill.mastery],
                )}
              >
                {MASTERY_LABEL[skill.mastery]}
              </span>
              <span className="text-muted-foreground text-xs">
                {MASTERY_DESCRIPTION[skill.mastery]}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <p className="text-muted-foreground text-xs font-medium">
                  Level
                </p>
                <p className="font-mono text-xs">
                  {skill.level} / {skill.requiredLevel} required
                </p>
              </div>
              <Progress
                className="h-1.5"
                value={(skill.level / Math.max(skill.requiredLevel, 1)) * 100}
              />
              {typeof skill.weight === "number" && (
                <p className="text-muted-foreground text-xs">
                  Importance to this goal: {skill.weight} / 5
                </p>
              )}
            </div>
          </>
        )}

        {skill.description && (
          <p className="text-sm leading-relaxed">{skill.description}</p>
        )}

        <SkillChips
          title={`Requires first (${prerequisites.length})`}
          skills={prerequisites}
          onSelect={onSelect}
        />
        <SkillChips
          title={`Unlocks (${unlocks.length})`}
          skills={unlocks}
          onSelect={onSelect}
        />
      </div>

      {!skill.aiGenerated && (
        <div className="border-t p-3">
          <Button
            size="sm"
            disabled={expanding}
            onClick={() => onExpand(skill.id)}
            className="bg-ai text-ai-foreground hover:bg-ai/90 w-full"
          >
            {expanding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Break into sub-skills
          </Button>
          <p className="text-muted-foreground mt-1.5 text-center text-[10px]">
            AI suggests three concrete sub-skills, grounded in the knowledge
            base.
          </p>
        </div>
      )}
    </div>
  );
}
