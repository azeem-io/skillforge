"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import type { ResourceLink } from "@/components/resources/resource-links";
import { categoryIndex, categoryOrder } from "@/lib/category";
import { type Mastery } from "@/lib/mastery";
import { layoutGraph, NODE_H, NODE_W } from "./layout";
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
  resources,
  focusSlug,
}: {
  skills: GraphSkill[];
  mode: Mode;
  highlight?: string[] | null;
  resources: Record<string, ResourceLink[]>;
  focusSlug?: string | null;
}) {
  const [skills, setSkills] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // `/graph?skill=<slug>` opens with that node already selected, which is what
  // lets the dashboard, the roadmap and the assistant point at one skill
  // rather than at the graph in general. Resolved during the first render so
  // the panel is there on the first paint; the camera follows in an effect
  // below, once ELK has actually placed the node.
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initial.find((skill) => skill.slug === focusSlug)?.id ?? null,
  );
  const { fitBounds, fitView, setCenter } = useReactFlow();

  // A new server payload — a different role, or a refresh — replaces whatever
  // the wand added locally. Adjusted during render rather than in an effect:
  // an effect would paint the previous role's nodes for one frame first.
  const [seeded, setSeeded] = useState(initial);
  if (seeded !== initial) {
    setSeeded(initial);
    setSkills(initial);
  }

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
        // A proxy 502 arrives as HTML, and `response.json()` would throw a
        // SyntaxError that reads to the student like a bug in the graph.
        const data = await response
          .json()
          .catch(() => ({ error: `Expand failed (${response.status}).` }));

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

  /**
   * The camera. Everything here works off the positions ELK produced rather
   * than off React Flow's node lookup: `fitView({ nodes: [...] })` needs nodes
   * React Flow has measured, and on this graph — controlled `nodes`, no
   * `onNodesChange` — it silently does nothing. Unfiltered `fitView` is fine,
   * so only the targeted moves are hand-rolled.
   *
   * NODE_W/NODE_H are the size SkillNode renders at, which is also what ELK
   * was told to lay out with.
   */
  const centerOn = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, {
        zoom: 1,
        duration: 500,
      });
    },
    [nodes, setCenter],
  );

  const frame = useCallback(
    (ids: string[]) => {
      const picked = nodes.filter((n) => ids.includes(n.id));
      if (picked.length === 0) return false;
      const left = Math.min(...picked.map((n) => n.position.x));
      const top = Math.min(...picked.map((n) => n.position.y));
      const right = Math.max(...picked.map((n) => n.position.x)) + NODE_W;
      const bottom = Math.max(...picked.map((n) => n.position.y)) + NODE_H;
      fitBounds(
        { x: left, y: top, width: right - left, height: bottom - top },
        { padding: 0.3, duration: 600 },
      );
      return true;
    },
    [nodes, fitBounds],
  );

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) centerOn(id);
    },
    [centerOn],
  );

  // The camera follows the spotlight, and returns to the whole graph when the
  // phase is deselected — which is what the roadmap's "click again to zoom
  // back out" has always promised.
  const spotlightKey = spotlightIds?.join() ?? "";
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      if (spotlightIds && frame(spotlightIds)) return;
      fitView({ padding: 0.15, duration: 600 });
    }, 60);
    return () => clearTimeout(timer);
    // `frame` and `spotlightIds` both change identity every render; the key is
    // what actually decides whether the spotlight moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlightKey, nodes.length === 0, fitView]);

  // The camera for a deep link. The selection itself is already set during
  // render; this only has to wait for ELK, then land after React Flow's own
  // initial fit — which reads as zooming out for context, then in on the node
  // the link named. Once, or it would fight every later click.
  const focusHandled = useRef(false);
  useEffect(() => {
    if (focusHandled.current || !focusSlug || !selectedId) return;
    if (!nodes.some((node) => node.id === selectedId)) return;
    focusHandled.current = true;
    const timer = setTimeout(() => centerOn(selectedId), 400);
    return () => clearTimeout(timer);
  }, [focusSlug, selectedId, nodes, centerOn]);

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
          resources={(selected.slug && resources[selected.slug]) || []}
          expanding={expanding}
          onSelect={select}
          onExpand={onExpand}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* The rail only exists at `sm` and up, so only shift for it there. On a
          phone the panel is a bottom sheet sitting exactly where the legend
          is, and the legend gets out of the way instead. */}
      <Legend className={selected ? "hidden sm:flex sm:left-1/3" : undefined} />

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
  resources = {},
  focusSlug,
}: {
  skills: GraphSkill[];
  mode?: Mode;
  highlight?: string[] | null;
  /** Keyed by skill slug — see `resourcesBySkill()`. */
  resources?: Record<string, ResourceLink[]>;
  focusSlug?: string | null;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner
        skills={skills}
        mode={mode}
        highlight={highlight}
        resources={resources}
        focusSlug={focusSlug}
      />
    </ReactFlowProvider>
  );
}
