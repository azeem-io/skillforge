"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";

import { CATEGORY_BAR } from "@/lib/category";
import { MASTERY_NODE, type Mastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";

export type SkillNodeData = {
  name: string;
  subcategory: string;
  category: string;
  categoryIndex: number;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  aiGenerated?: boolean;
  loading?: boolean;
  onExpand?: (id: string) => void;
};

function LevelDots({ level, required }: { level: number; required: number }) {
  return (
    <span
      className="flex items-center gap-0.75"
      aria-label={`Level ${level} of ${required}`}
    >
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.25 rounded-full",
            i < level ? "bg-current opacity-90" : "bg-current opacity-25",
          )}
        />
      ))}
    </span>
  );
}

export function SkillNode({ id, data, selected }: NodeProps) {
  const d = data as SkillNodeData;

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-lg border shadow-sm transition-all",
        "hover:shadow-md",
        MASTERY_NODE[d.mastery],
        d.aiGenerated && "border-ai border-dashed",
        selected && "ring-ring ring-2 ring-offset-2",
      )}
      style={{ width: 224, height: 72 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="size-0! min-h-0! min-w-0! border-0! bg-transparent!"
      />

      <span
        className={cn("w-1 shrink-0", CATEGORY_BAR[d.categoryIndex])}
        aria-hidden
      />

      {d.loading ? (
        <div className="text-ai flex flex-1 items-center gap-2 px-3 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          Generating…
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
          <div className="flex items-center gap-1.5">
            {d.mastery === "locked" && (
              <Lock className="size-3 shrink-0 opacity-70" />
            )}
            {d.mastery === "mastered" && (
              <Check className="size-3 shrink-0 opacity-80" />
            )}
            {d.aiGenerated && <Sparkles className="text-ai size-3 shrink-0" />}
            <span className="truncate text-[13px] leading-tight font-medium">
              {d.name}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="truncate rounded bg-current/10 px-1.5 py-0.5 text-[10px] leading-none font-medium opacity-70">
              {d.aiGenerated ? "AI suggested" : d.subcategory}
            </span>
            {!d.aiGenerated && (
              <LevelDots level={d.level} required={d.requiredLevel} />
            )}
          </div>
        </div>
      )}

      {!d.aiGenerated && !d.loading && (
        <button
          type="button"
          aria-label={`Expand ${d.name} into sub-skills`}
          onClick={(e) => {
            e.stopPropagation();
            d.onExpand?.(id);
          }}
          className="border-ai bg-ai text-ai-foreground absolute top-1.5 right-1.5 hidden size-6 items-center justify-center rounded-full border shadow-sm group-hover:flex focus-visible:flex"
        >
          <Sparkles className="size-3" />
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="size-0! min-h-0! min-w-0! border-0! bg-transparent!"
      />
    </div>
  );
}
