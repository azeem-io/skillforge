"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { categoryIndex, categoryOrder } from "@/lib/category";
import { type Mastery } from "@/lib/mastery";
import { layoutGraph } from "./layout";
import { Legend } from "./legend";
import { SkillNode } from "./skill-node";
import { SkillPanel } from "./skill-panel";

const nodeTypes = { skill: SkillNode };

export type GraphSkill = {
  id: string;
  slug?: string;
  name: string;
  subcategory: string;
  category: string;
  description?: string | null;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  weight?: number;
  prerequisites: string[];
  aiGenerated?: boolean;
  loading?: boolean;
};

type Mode = "explore" | "roadmap";

function GraphInner({
  skills: initial,
  mode,
  highlight,
}: {
  skills: GraphSkill[];
  mode: Mode;
  highlight?: string[] | null;
}) {
  const [skills, setSkills] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  useEffect(() => setSkills(initial), [initial]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) {
        fitView({ nodes: [{ id }], duration: 500, padding: 0.4, maxZoom: 1.1 });
      }
    },
    [fitView],
  );

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

  const { rawNodes, edges, spotlightIds } = useMemo(() => {
    const visible =
      mode === "roadmap"
        ? skills.filter((s) => s.mastery === "gap" || s.mastery === "locked")
        : skills;
    const ids = new Set(visible.map((s) => s.id));

    // Slugs arrive from the saved roadmap; drop any not on screen so an
    // out-of-date plan cannot spotlight nothing.
    const wanted = highlight
      ? new Set(
          visible
            .filter((s) => s.slug && highlight.includes(s.slug))
            .map((s) => s.id),
        )
      : null;
    const spotlight = wanted && wanted.size > 0 ? wanted : null;

    const built: Node[] = visible.map((s) => ({
      id: s.id,
      type: "skill",
      position: { x: 0, y: 0 },
      data: {
        ...s,
        categoryIndex: categoryIndex(s.category, order),
        dimmed: spotlight ? !spotlight.has(s.id) : false,
      },
    }));

    const builtEdges: Edge[] = visible.flatMap((s) =>
      s.prerequisites
        .filter((p) => ids.has(p))
        .map((p) => ({
          id: `${p}-${s.id}`,
          source: p,
          target: s.id,
          // Dashed motion only while the model is generating; a finished
          // suggestion settles into a solid AI-tinted edge.
          animated: Boolean(s.loading),
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: {
            strokeWidth: 1.5,
            ...(s.aiGenerated ? { stroke: "var(--ai)" } : {}),
            opacity:
              spotlight && !(spotlight.has(p) && spotlight.has(s.id))
                ? 0.12
                : 1,
          },
        })),
    );

    return {
      rawNodes: built,
      edges: builtEdges,
      spotlightIds: spotlight ? [...spotlight] : null,
    };
  }, [skills, mode, order, highlight]);

  // ELK is async, so positions land in state a beat after the data does. The
  // CSS transition on .react-flow__node is what turns that update into a
  // glide — existing nodes drift to their new places instead of jumping.
  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    let cancelled = false;
    layoutGraph(rawNodes, edges, (n) => String(n.data.category ?? "")).then(
      (laid) => {
        if (!cancelled) setNodes(laid);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [rawNodes, edges]);

  // The camera follows the spotlight. fitView's duration is what turns the
  // move into a glide instead of a cut.
  const spotlightKey = spotlightIds?.join() ?? "";
  useEffect(() => {
    if (nodes.length === 0) return;
    const target = spotlightIds
      ? { nodes: spotlightIds.map((id) => ({ id })), padding: 0.3 }
      : { padding: 0.15 };
    const timer = setTimeout(() => fitView({ ...target, duration: 600 }), 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlightKey, nodes.length === 0, fitView]);

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const expanding = selectedId
    ? skills.some((s) => s.id.startsWith(`${selectedId}::ai`) && s.loading)
    : false;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => select(node.id)}
        onPaneClick={() => setSelectedId(null)}
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

      {selected && (
        <SkillPanel
          skill={selected}
          categoryIndex={categoryIndex(selected.category, order)}
          prerequisites={selected.prerequisites
            .map((p) => byId.get(p))
            .filter((s): s is GraphSkill => Boolean(s))}
          unlocks={skills.filter((s) =>
            s.prerequisites.includes(selected.id),
          )}
          expanding={expanding}
          onSelect={select}
          onExpand={onExpand}
          onClose={() => setSelectedId(null)}
        />
      )}

      <Legend className={selected ? "left-1/3" : undefined} />

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
  highlight,
}: {
  skills: GraphSkill[];
  mode?: Mode;
  highlight?: string[] | null;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner skills={skills} mode={mode} highlight={highlight} />
    </ReactFlowProvider>
  );
}
