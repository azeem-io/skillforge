import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

export const NODE_W = 216;
export const NODE_H = 64;

const GROUP_GAP = 88;

const elk = new ELK();

const FLOW: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.spacing.nodeNodeBetweenLayers": "72",
  "elk.spacing.nodeNode": "18",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "elk.separateConnectedComponents": "true",
  "elk.spacing.componentComponent": "40",
};

async function flat(
  nodes: Node[],
  edges: Edge[],
): Promise<{ positions: Map<string, { x: number; y: number }>; height: number }> {
  const ids = new Set(nodes.map((n) => n.id));
  const laid = await elk.layout({
    id: "root",
    layoutOptions: FLOW,
    children: nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    // Only edges internal to this set — ELK crashes on dangling endpoints.
    edges: edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  return {
    positions: new Map(
      (laid.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]),
    ),
    height: (laid as { height?: number }).height ?? 0,
  };
}

/**
 * One horizontal band per group, stacked top to bottom, each band's chains
 * flowing left to right. Bands are laid out independently and stacked by hand:
 * elkjs's compound-node hierarchy crashes on cross-group edges, so the bands
 * never see them — React Flow still draws those edges between the bands.
 */
export async function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  groupOf?: (node: Node) => string,
): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  try {
    const groups = new Map<string, Node[]>();
    for (const node of nodes) {
      const key = groupOf?.(node) ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(node);
    }

    if (!groupOf || groups.size < 2) {
      const { positions } = await flat(nodes, edges);
      return nodes.map((n) => ({
        ...n,
        position: positions.get(n.id) ?? n.position,
      }));
    }

    // Stable band order: alphabetical, matching the category colour order.
    const keys = [...groups.keys()].sort();
    const laid = await Promise.all(keys.map((k) => flat(groups.get(k)!, edges)));

    const position = new Map<string, { x: number; y: number }>();
    let offset = 0;
    for (const band of laid) {
      for (const [id, p] of band.positions) {
        position.set(id, { x: p.x, y: p.y + offset });
      }
      offset += band.height + GROUP_GAP;
    }

    return nodes.map((n) => ({
      ...n,
      position: position.get(n.id) ?? n.position,
    }));
  } catch (error) {
    // A layout failure must never blank the graph. Fall back to a plain grid.
    console.error("[layout] elk failed, using grid fallback:", error);
    const columns = Math.ceil(Math.sqrt(nodes.length));
    return nodes.map((n, i) => ({
      ...n,
      position: {
        x: (i % columns) * (NODE_W + 40),
        y: Math.floor(i / columns) * (NODE_H + 40),
      },
    }));
  }
}
