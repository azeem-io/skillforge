import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

export const NODE_W = 216;
export const NODE_H = 64;

const elk = new ELK();

const FLOW: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.spacing.nodeNodeBetweenLayers": "72",
  "elk.spacing.nodeNode": "18",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
};

/**
 * One compound box per group, stacked top to bottom, with each group's chains
 * flowing left to right inside it. Keeps categories in their own horizontal
 * band instead of crossing-minimisation interleaving unrelated skills.
 * Cross-group prerequisite edges still route between the bands.
 */
export async function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  groupOf?: (node: Node) => string,
): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const groups = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = groupOf?.(node) ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(node);
  }

  const grouped = groupOf && groups.size > 1;

  const laid = await elk.layout({
    id: "root",
    layoutOptions: grouped
      ? {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.hierarchyHandling": "INCLUDE_CHILDREN",
          "elk.spacing.nodeNode": "56",
          "elk.layered.spacing.nodeNodeBetweenLayers": "56",
        }
      : FLOW,
    children: grouped
      ? [...groups.entries()].map(([key, members]) => ({
          id: `group:${key}`,
          layoutOptions: {
            ...FLOW,
            "elk.padding": "[top=24,left=24,bottom=24,right=24]",
          },
          children: members.map((n) => ({
            id: n.id,
            width: NODE_W,
            height: NODE_H,
          })),
        }))
      : nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  });

  const position = new Map<string, { x: number; y: number }>();
  const walk = (
    children: { id: string; x?: number; y?: number; children?: unknown }[],
    dx: number,
    dy: number,
  ) => {
    for (const child of children) {
      const x = dx + (child.x ?? 0);
      const y = dy + (child.y ?? 0);
      if (child.children) {
        walk(child.children as typeof children, x, y);
      } else {
        position.set(child.id, { x, y });
      }
    }
  };
  walk((laid.children ?? []) as Parameters<typeof walk>[0], 0, 0);

  return nodes.map((n) => ({ ...n, position: position.get(n.id) ?? n.position }));
}
