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

import { SKILLS, type MockSkill } from "@/lib/mock";
import { MASTERY_DOT, MASTERY_LABEL, type Mastery } from "@/lib/mastery";
import { layoutGraph, rankOf } from "./layout";
import { SkillNode } from "./skill-node";

const nodeTypes = { skill: SkillNode };

const MASTERY_ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

type Mode = "explore" | "roadmap";

function build(skills: MockSkill[], onExpand: (id: string) => void) {
  const nodes: Node[] = skills.map((s) => ({
    id: s.id,
    type: "skill",
    position: { x: 0, y: 0 },
    data: {
      name: s.name,
      subcategory: s.subcategory,
      mastery: s.mastery,
      level: s.level,
      requiredLevel: s.requiredLevel,
      onExpand,
    },
  }));

  const edges: Edge[] = skills.flatMap((s) =>
    s.prerequisites.map((p) => ({
      id: `${p}-${s.id}`,
      source: p,
      target: s.id,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { strokeWidth: 1.5 },
    })),
  );

  return { nodes, edges };
}

function GraphInner({ mode }: { mode: Mode }) {
  const [skills, setSkills] = useState(SKILLS);

  // Stands in for the AI expand tool: ghost children appear immediately with
  // the edge already drawn, then fill once ai-service returns.
  const onExpand = useCallback((id: string) => {
    setSkills((prev) => {
      const parent = prev.find((s) => s.id === id);
      if (!parent || prev.some((s) => s.id === `${id}-sub-1`)) return prev;
      const children: MockSkill[] = [1, 2].map((i) => ({
        id: `${id}-sub-${i}`,
        name: `Sub-skill ${i}`,
        subcategory: parent.subcategory,
        category: parent.category,
        mastery: "gap",
        level: 0,
        requiredLevel: parent.requiredLevel,
        prerequisites: [id],
      }));
      return [...prev, ...children];
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const visible =
      mode === "roadmap"
        ? skills.filter((s) => s.mastery === "gap" || s.mastery === "locked")
        : skills;
    const ids = new Set(visible.map((s) => s.id));
    const scoped = visible.map((s) => ({
      ...s,
      prerequisites: s.prerequisites.filter((p) => ids.has(p)),
    }));
    const built = build(scoped, onExpand);
    return {
      nodes: layoutGraph(built.nodes, built.edges, "LR"),
      edges: built.edges,
    };
  }, [skills, mode, onExpand]);

  const phases = useMemo(() => {
    if (mode !== "roadmap") return null;
    const ranks = rankOf(nodes, edges);
    return Math.max(0, ...ranks.values()) + 1;
  }, [mode, nodes, edges]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="bg-card/90 absolute top-3 left-3 rounded-md border p-3 text-xs backdrop-blur">
        <div className="mb-2 font-medium">
          {mode === "roadmap" ? `Roadmap · ${phases} phases` : "Mastery"}
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

export function SkillGraph({ mode = "explore" }: { mode?: Mode }) {
  return (
    <ReactFlowProvider>
      <GraphInner mode={mode} />
    </ReactFlowProvider>
  );
}
