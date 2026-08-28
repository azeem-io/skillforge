"use client";

import { useReveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

/**
 * The product, drawn.
 *
 * A prerequisite DAG that resolves itself: nodes arrive, edges draw between
 * them, then the mastery colour fills in dependency order — roots first,
 * because that is the order the real graph resolves in. The two gaps keep a
 * slow halo afterwards, since a gap is the only state a student can act on and
 * the whole page is an argument for looking at them.
 *
 * Deliberately not a screenshot: it is the same four mastery tokens and the
 * same layering rule the app itself uses, so what a visitor learns here is
 * true when they sign in.
 */

type Mastery = "mastered" | "progress" | "gap" | "locked";

const NODE_W = 122;
const NODE_H = 34;

type Node = { id: string; label: string; x: number; y: number; mastery: Mastery };

/** Four ranks left to right — the same topological layering the roadmap uses. */
const NODES: Node[] = [
  { id: "python", label: "Python", x: 4, y: 26, mastery: "mastered" },
  { id: "git", label: "Git", x: 4, y: 170, mastery: "mastered" },
  { id: "functions", label: "Functions", x: 150, y: 96, mastery: "mastered" },
  { id: "branching", label: "Branching", x: 150, y: 218, mastery: "progress" },
  { id: "numpy", label: "NumPy", x: 296, y: 40, mastery: "progress" },
  { id: "testing", label: "Unit Testing", x: 296, y: 170, mastery: "gap" },
  { id: "pandas", label: "Pandas", x: 442, y: 96, mastery: "gap" },
  { id: "cicd", label: "CI/CD", x: 442, y: 240, mastery: "locked" },
];

const EDGES: [string, string][] = [
  ["python", "functions"],
  ["python", "numpy"],
  ["git", "branching"],
  ["functions", "numpy"],
  ["functions", "testing"],
  ["branching", "testing"],
  ["numpy", "pandas"],
  ["testing", "cicd"],
];

const RING: Record<Mastery, string> = {
  mastered: "var(--color-mastery-mastered-ring)",
  progress: "var(--color-mastery-progress-ring)",
  gap: "var(--color-mastery-gap-ring)",
  locked: "var(--color-mastery-locked-ring)",
};

const TINT: Record<Mastery, string> = {
  mastered: "var(--color-mastery-mastered-bg)",
  progress: "var(--color-mastery-progress-bg)",
  gap: "var(--color-mastery-gap-bg)",
  locked: "var(--color-mastery-locked-bg)",
};

const byId = new Map(NODES.map((node) => [node.id, node]));

/** Out of the right edge of one pill, into the left edge of the next. The
 *  control points are horizontal so every edge leaves and lands flat, which is
 *  what stops a dense graph reading as spaghetti. */
function edgePath(from: Node, to: Node): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const dx = Math.max(36, (x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export function HeroGraph({ className }: { className?: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>("0px");

  // Gaps pulse after everything has resolved; index them separately so the two
  // halos are offset from each other rather than beating in unison.
  let gapIndex = 0;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <svg
        viewBox="0 0 568 300"
        role="img"
        aria-label="A prerequisite graph: Python and Git are mastered, Branching and NumPy are in progress, Unit Testing and Pandas are gaps, and CI/CD is still locked behind them."
        className="w-full overflow-visible"
      >
        <g>
          {EDGES.map(([fromId, toId], i) => {
            const from = byId.get(fromId)!;
            const to = byId.get(toId)!;
            return (
              <path
                key={`${fromId}-${toId}`}
                d={edgePath(from, to)}
                fill="none"
                stroke="var(--color-muted-dim)"
                strokeWidth={2}
                strokeLinecap="round"
                // Normalised, so one dash length is correct for every curve
                // regardless of how long it actually is.
                pathLength={1}
                style={{ "--i": i, "--len": 1 } as React.CSSProperties}
                className={shown ? "graph-edge" : "graph-hidden"}
              />
            );
          })}
        </g>

        {NODES.map((node, i) => {
          const isGap = node.mastery === "gap";
          const haloIndex = isGap ? gapIndex++ : 0;

          return (
            <g
              key={node.id}
              style={{ "--i": i } as React.CSSProperties}
              className={shown ? "graph-node" : "graph-hidden"}
            >
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="var(--color-card)"
                stroke="var(--color-border)"
                strokeWidth={1}
              />

              <g
                style={{ "--i": i } as React.CSSProperties}
                className={shown ? "graph-mastery" : "graph-hidden"}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={TINT[node.mastery]}
                  stroke={RING[node.mastery]}
                  strokeWidth={1.25}
                />
                {isGap && (
                  <circle
                    cx={node.x + 16}
                    cy={node.y + NODE_H / 2}
                    r={4}
                    fill={RING.gap}
                    style={{ "--i": haloIndex } as React.CSSProperties}
                    className="graph-halo"
                  />
                )}
                <circle
                  cx={node.x + 16}
                  cy={node.y + NODE_H / 2}
                  r={3.5}
                  fill={RING[node.mastery]}
                />
              </g>

              <text
                x={node.x + 29}
                y={node.y + NODE_H / 2 + 4}
                className="fill-foreground text-[11.5px] font-medium"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
