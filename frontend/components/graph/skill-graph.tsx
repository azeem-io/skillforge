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

import { categoryIndex, categoryOrder } from "@/lib/category";
import { MASTERY_DOT, MASTERY_LABEL, type Mastery } from "@/lib/mastery";
import { layoutGraph } from "./layout";
import { SkillNode } from "./skill-node";

const nodeTypes = { skill: SkillNode };
const MASTERY_ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

export type GraphSkill = {
  id: string;
  name: string;
  subcategory: string;
  category: string;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  prerequisites: string[];
  aiGenerated?: boolean;
  loading?: boolean;
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
  const [error, setError] = useState<string | null>(null);

  const onExpand = useCallback(
    async (id: string) => {
      const parent = skills.find((s) => s.id === id);
      if (!parent || skills.some((s) => s.id.startsWith(`${id}::ai`))) return;

      setError(null);

      // Ghost children appear immediately with edges already drawn, then fill
      // when the model returns. Waiting on the request first makes the graph
      // feel broken for the second or two it takes.
      const ghosts: GraphSkill[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${id}::ai${i}`,
        name: "",
        subcategory: parent.subcategory,
        category: parent.category,
        mastery: "gap",
        level: 0,
        requiredLevel: parent.requiredLevel,
        prerequisites: [id],
        aiGenerated: true,
        loading: true,
      }));
      setSkills((prev) => [...prev, ...ghosts]);

      try {
        const response = await fetch("/ai/expand", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            skill: parent.name,
            subcategory: parent.subcategory,
            count: 3,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setSkills((prev) => prev.filter((s) => !s.id.startsWith(`${id}::ai`)));
          setError(data.hint ?? data.error ?? "Expand failed.");
          return;
        }

        const subs: { name: string }[] = data.sub_skills ?? [];
        setSkills((prev) =>
          prev
            .filter((s) => !s.id.startsWith(`${id}::ai`))
            .concat(
              subs.map((sub, i) => ({
                ...ghosts[i]!,
                name: sub.name,
                loading: false,
              })),
            ),
        );
      } catch (e) {
        setSkills((prev) => prev.filter((s) => !s.id.startsWith(`${id}::ai`)));
        setError(e instanceof Error ? e.message : "Expand failed.");
      }
    },
    [skills],
  );

  const order = useMemo(
    () => categoryOrder(skills.map((s) => s.category)),
    [skills],
  );

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
      data: { ...s, categoryIndex: categoryIndex(s.category, order), onExpand },
    }));

    const builtEdges: Edge[] = visible.flatMap((s) =>
      s.prerequisites
        .filter((p) => ids.has(p))
        .map((p) => ({
          id: `${p}-${s.id}`,
          source: p,
          target: s.id,
          animated: s.aiGenerated,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: { strokeWidth: 1.5 },
        })),
    );

    return { nodes: layoutGraph(built, builtEdges, "LR"), edges: builtEdges };
  }, [skills, mode, onExpand, order]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.6}
        nodesConnectable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
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
        <p className="text-muted-foreground mt-2 border-t pt-2">
          Hover a node for the <span className="text-ai font-medium">wand</span>
        </p>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground absolute right-3 bottom-3 max-w-md rounded-md px-3 py-2 text-xs">
          {error}
        </div>
      )}
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
