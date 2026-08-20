import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

export const NODE_W = 190;
export const NODE_H = 56;

export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 28, ranksep: 90 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}

// Rank = phase. Same longest-path layering the Python service will own once
// python-analyzer is wired; kept here so the roadmap lens renders before then.
export function rankOf(nodes: Node[], edges: Edge[]): Map<string, number> {
  const incoming = new Map<string, string[]>();
  nodes.forEach((n) => incoming.set(n.id, []));
  edges.forEach((e) => incoming.get(e.target)?.push(e.source));

  const rank = new Map<string, number>();
  const visit = (id: string, seen: Set<string>): number => {
    if (rank.has(id)) return rank.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parents = incoming.get(id) ?? [];
    const r = parents.length
      ? Math.max(...parents.map((p) => visit(p, seen))) + 1
      : 0;
    rank.set(id, r);
    return r;
  };
  nodes.forEach((n) => visit(n.id, new Set()));
  return rank;
}
