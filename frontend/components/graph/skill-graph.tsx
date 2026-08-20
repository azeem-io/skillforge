"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { MASTERY_DOT, MASTERY_LABEL, type Mastery } from "@/lib/mastery";
import { layoutGraph } from "./layout";
import { SkillNode } from "./skill-node";

const nodeTypes = { skill: SkillNode };
const MASTERY_ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

export type GraphSkill = {
  id: string;
  name: string;
  subcategory: string;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  prerequisites: string[];
};

type Mode = "explore" | "roadmap";

function GraphInner({
  skills: initial,
  mode,
}: {
  skills: GraphSkill[];
  mode: Mode;
}) {
  const [skills, setSkills] = useState(initial);

  // Stands in for the AI expand tool: children appear immediately with the edge
  // already drawn, then fill once ai-service returns.
  const onExpand = useCallback((id: string) => {
    setSkills((prev) => {
      const parent = prev.find((s) => s.id === id);
      if (!parent || prev.some((s) => s.id === `${id}-sub-1`)) return prev;
      return [
        ...prev,
        ...[1, 2].map((i) => ({
          id: `${id}-sub-${i}`,
          name: `Sub-skill ${i}`,
          subcategory: parent.subcategory,
          mastery: "gap" as Mastery,
          level: 0,
          requiredLevel: parent.requiredLevel,
          prerequisites: [id],
        })),
      ];
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const visible =
      mode === "roadmap"
        ? skills.filter((s) => s.mastery === "gap" || s.mastery === "locked")
        : skills;
    const ids = new Set(visible.map((s) => s.id));

    const built: Node[] = visible.map((s) => ({
      id: s.id,
      type: "skill",
      position: { x: 0, y: 0 },
      data: { ...s, onExpand },
    }));

    const builtEdges: Edge[] = visible.flatMap((s) =>
      s.prerequisites
        .filter((p) => ids.has(p))
        .map((p) => ({
          id: `${p}-${s.id}`,
          source: p,
          target: s.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: { strokeWidth: 1.5 },
        })),
    );

    return {
      nodes: layoutGraph(built, builtEdges, "LR"),
      edges: builtEdges,
    };
  }, [skills, mode, onExpand]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="bg-card/90 absolute top-3 left-3 rounded-md border p-3 text-xs backdrop-blur">
        <div className="mb-2 font-medium">
          {mode === "roadmap" ? "To learn" : "Mastery"} · {nodes.length} skills
        </div>
        <ul className="space-y-1.5">
          {MASTERY_ORDER.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${MASTERY_DOT[m]}`} />
              <span className="text-muted-foreground">{MASTERY_LABEL[m]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SkillGraph({
  skills,
  mode = "explore",
}: {
  skills: GraphSkill[];
  mode?: Mode;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner skills={skills} mode={mode} />
    </ReactFlowProvider>
  );
}
