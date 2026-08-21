"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";

import { CATEGORY_BAR } from "@/lib/category";
import { MASTERY_NODE, type Mastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";
import { NODE_H, NODE_W } from "./layout";

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
  dimmed?: boolean;
};

const HIDDEN_HANDLE = "size-0! min-h-0! min-w-0! border-0! bg-transparent!";

function LevelDots({ level, required }: { level: number; required: number }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      aria-label={`Level ${level} of ${required}`}
    >
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full bg-current",
            i < level ? "opacity-90" : "opacity-25",
          )}
        />
      ))}
    </span>
  );
}

// Keystone LOFlow shape — flat, soft corners, a colour band inset on the left,
// the subcategory as a tag — with the mastery-tinted background kept, because
// the tint is what reads at a distance.
export function SkillNode({ data, selected }: NodeProps) {
  const d = data as SkillNodeData;

  return (
    <div
      className={cn(
        "skill-node-enter relative flex cursor-pointer flex-col justify-center gap-1.5 rounded-xl border py-2 pr-3 pl-6 transition-[opacity,border-color,box-shadow]",
        MASTERY_NODE[d.mastery],
        "hover:shadow-md",
        d.aiGenerated && "border-ai/60",
        d.loading && "border-ai border-dashed",
        selected && "border-ring shadow-md",
        d.dimmed && "pointer-events-none opacity-15",
      )}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />

      <span
        className={cn(
          "absolute top-2 bottom-2 left-2 w-1.5 rounded-full",
          CATEGORY_BAR[d.categoryIndex],
        )}
        aria-hidden
      />

      {d.loading ? (
        <div className="text-ai flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          Generating…
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-1.5">
            <p className="truncate text-[13px] leading-snug font-medium">
              {d.name}
            </p>
            {d.mastery === "mastered" && (
              <Check className="mt-0.5 size-3.5 shrink-0 opacity-80" />
            )}
            {d.mastery === "locked" && (
              <Lock className="mt-0.5 size-3 shrink-0 opacity-70" />
            )}
            {d.aiGenerated && (
              <Sparkles className="text-ai mt-0.5 size-3.5 shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="truncate rounded bg-current/10 px-1.5 py-0.5 text-[10px] leading-none font-medium opacity-80">
              {d.aiGenerated ? "AI suggested" : d.subcategory}
            </span>
            {!d.aiGenerated && (
              <LevelDots level={d.level} required={d.requiredLevel} />
            )}
          </div>
        </>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </div>
  );
}
