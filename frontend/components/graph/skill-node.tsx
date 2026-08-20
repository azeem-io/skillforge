"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Lock, Sparkles } from "lucide-react";

import { MASTERY_NODE, type Mastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";

export type SkillNodeData = {
  name: string;
  subcategory: string;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  onExpand?: (id: string) => void;
};

export function SkillNode({ id, data, selected }: NodeProps) {
  const d = data as SkillNodeData;

  return (
    <div
      className={cn(
        "group relative rounded-md border-2 px-3 py-2 shadow-sm transition-shadow",
        MASTERY_NODE[d.mastery],
        selected && "ring-ring ring-2 ring-offset-2",
      )}
      style={{ width: 190, height: 56 }}
    >
      <Handle type="target" position={Position.Left} className="!size-2" />

      <div className="flex h-full flex-col justify-center gap-0.5 overflow-hidden">
        <div className="flex items-center gap-1">
          {d.mastery === "locked" && <Lock className="size-3 shrink-0" />}
          <span className="truncate text-sm font-medium">{d.name}</span>
        </div>
        <span className="truncate text-[11px] opacity-70">
          {d.mastery === "gap" || d.mastery === "locked"
            ? `Needs level ${d.requiredLevel}`
            : `Level ${d.level} of ${d.requiredLevel}`}
        </span>
      </div>

      <button
        type="button"
        aria-label={`Expand ${d.name} into sub-skills`}
        onClick={(e) => {
          e.stopPropagation();
          d.onExpand?.(id);
        }}
        className="border-ai bg-ai text-ai-foreground absolute -top-2 -right-2 hidden size-6 items-center justify-center rounded-full border shadow-sm group-hover:flex focus-visible:flex"
      >
        <Sparkles className="size-3" />
      </button>

      <Handle type="source" position={Position.Right} className="!size-2" />
    </div>
  );
}
