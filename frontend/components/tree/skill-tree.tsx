"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import { Lock, Maximize2, Search, X } from "lucide-react";

import {
  CATEGORY_BAR,
  CATEGORY_STROKE,
  categoryIndex,
  categoryOrder,
} from "@/lib/category";
import {
  MASTERY_CIRCLE,
  MASTERY_DOT,
  MASTERY_LABEL,
  MASTERY_TEXT,
  type Mastery,
} from "@/lib/mastery";
import { cn } from "@/lib/utils";
import { LINE_HEIGHT, measureStore, wrapLabel } from "./label";
import { TreeDetail } from "./tree-detail";
import { ROOT_ID, SIZE, type TreeDatum } from "./types";
import { useZoom } from "./use-zoom";

type Node = HierarchyCircularNode<TreeDatum>;

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

const KIND: Record<TreeDatum["altitude"], string> = {
  ROOT: "",
  CATEGORY: "Category",
  SUBCATEGORY: "Subcategory",
  SKILL: "Skill",
};

// Leaf area is what the goal demands of it, so the skills that matter most are
// the biggest circles. The floor keeps skills the role does not require
// (weight 0) visible rather than invisible.
const leafValue = (d: TreeDatum) => Math.max(4, d.requiredLevel * d.weight);

const LABEL_PX = { ROOT: 17, CATEGORY: 15, SUBCATEGORY: 12, SKILL: 11 };
const LABEL_MIN_R = { ROOT: 110, CATEGORY: 46, SUBCATEGORY: 58, SKILL: 15 };

export function SkillTree({
  categories,
  roleName,
}: {
  categories: TreeDatum[];
  roleName: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, flyTo } = useZoom(svgRef);

  const [focusId, setFocusId] = useState(ROOT_ID);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Canvas is client-only. useSyncExternalStore hydrates with the server's
  // estimate and swaps in exact widths straight after, with no mismatch.
  const measure = useSyncExternalStore(
    measureStore.subscribe,
    measureStore.get,
    measureStore.getServer,
  );

  const root = useMemo(() => {
    const data: TreeDatum = {
      id: ROOT_ID,
      name: "You",
      altitude: "ROOT",
      description: null,
      mastery: null,
      level: 0,
      requiredLevel: 0,
      weight: 0,
      children: categories,
    };
    return pack<TreeDatum>().size([SIZE, SIZE]).padding(4)(
      hierarchy<TreeDatum>(data, (d) => d.children)
        .sum((d) => (d.children?.length ? 0 : leafValue(d)))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    );
  }, [categories]);

  const nodes = useMemo(() => root.descendants(), [root]);
  const byId = useMemo(
    () => new Map(nodes.map((n) => [n.data.id, n])),
    [nodes],
  );
  const lookup = useCallback((id: string) => byId.get(id)?.data, [byId]);

  // Colour slots are keyed on the depth-1 ancestor, so every descendant of a
  // category inherits that category's colour.
  const catIndexById = useMemo(() => {
    const order = categoryOrder(categories.map((c) => c.name));
    const out = new Map<string, number>();
    for (const n of nodes) {
      const cat = n.depth === 0 ? null : n.ancestors().at(-2)!;
      out.set(n.data.id, cat ? categoryIndex(cat.data.name, order) : 7);
    }
    return out;
  }, [nodes, categories]);

  const q = query.trim().toLowerCase();

  // Nodes come back breadth-first, so categories rank above subcategories
  // above skills without a second sort.
  const matches = useMemo(() => {
    if (q.length < 2) return [];
    return nodes
      .filter(
        (n) =>
          n.data.altitude !== "ROOT" && n.data.name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [nodes, q]);

  // Everything on an ancestor chain to a match stays lit; the rest recedes.
  const lit = useMemo(() => {
    if (q.length < 2) return null;
    const s = new Set<string>();
    for (const n of nodes) {
      if (n.data.altitude === "ROOT") continue;
      if (!n.data.name.toLowerCase().includes(q)) continue;
      for (const a of n.ancestors()) s.add(a.data.id);
      // A matched group brings its contents with it — you searched for the
      // group, so what is inside it should stay readable.
      if (n.children?.length) for (const d of n.descendants()) s.add(d.data.id);
    }
    return s;
  }, [nodes, q]);

  const focus = byId.get(focusId) ?? root;
  const shown = byId.get(selectedId ?? "") ?? byId.get(hoverId ?? "") ?? root;

  const goto = useCallback(
    (id: string) => {
      const n = byId.get(id);
      if (!n) return;

      // Clicking the container you are already inside steps back out, so the
      // same gesture moves in both directions.
      if (n.children?.length && selectedId === id && focusId === id) {
        const up = n.parent ?? root;
        setSelectedId(up === root ? null : up.data.id);
        setFocusId(up.data.id);
        flyTo(up.x, up.y, up.r);
        return;
      }

      setSelectedId(id);
      if (n.children?.length) {
        setFocusId(id);
        flyTo(n.x, n.y, n.r);
      } else {
        // Framing a leaf at its own radius fills the screen with one circle;
        // pulling back shows it among the siblings it sits with.
        setFocusId(n.parent?.data.id ?? ROOT_ID);
        flyTo(n.x, n.y, n.r * 5);
      }
    },
    [byId, flyTo, selectedId, focusId, root],
  );

  const reset = useCallback(() => {
    setSelectedId(null);
    setFocusId(ROOT_ID);
    setQuery("");
    flyTo(root.x, root.y, root.r);
  }, [flyTo, root]);

  const k = transform.k;

  const labelled = useMemo(() => {
    const out: {
      n: Node;
      lines: string[];
      width: number;
      px: number;
      top: boolean;
      locked: boolean;
    }[] = [];

    for (const n of nodes) {
      const d = n.data;
      const sr = n.r * k;
      if (sr < LABEL_MIN_R[d.altitude]) continue;
      if (lit && !lit.has(d.id)) continue;

      const top = d.altitude !== "SKILL";
      // At the top of a circle the usable width is a chord, not the diameter.
      const px = LABEL_PX[d.altitude];
      // A lock sits inline ahead of the name, so it has to come out of the
      // width the name is allowed.
      const locked = d.mastery === "locked";
      const room = sr * (top ? 1.5 : 1.7) - (locked ? px * 1.2 : 0);
      const w = wrapLabel(d.name, px, room, measure, top);
      if (!w) continue;
      if (!top && w.height > sr * 1.5) continue;
      if (top && sr > SIZE * 0.85) continue;

      out.push({
        n,
        lines: w.lines,
        width: w.width,
        px,
        top,
        // The glyph sits beside a single line; stacking it against wrapped text
        // has nowhere to sit without unbalancing the circle. It also needs the
        // measured width to line up, so it waits for the measurer.
        locked: locked && w.lines.length === 1 && measure !== null,
      });
    }
    return out;
  }, [nodes, k, lit, measure]);

  // Nothing here depends on the zoom scale, so the memo keeps the element
  // references stable and React skips 136 circles on every pan and wheel frame.
  const circles = useMemo(
    () =>
      nodes.map((n) => {
        const d = n.data;
        const dim = lit ? !lit.has(d.id) : false;
        // Keyboard targets follow the level you are looking at rather than the
        // scale, so tab order does not churn while zooming.
        const focusable = d.altitude !== "SKILL" || n.parent === focus;

        return (
          <circle
            key={d.id}
            cx={n.x}
            cy={n.y}
            r={n.r}
            vectorEffect="non-scaling-stroke"
            strokeWidth={
              selectedId === d.id ? 3 : d.altitude === "SUBCATEGORY" ? 1 : 1.75
            }
            tabIndex={focusable ? 0 : -1}
            role={focusable ? "button" : undefined}
            aria-label={
              focusable
                ? `${d.name}${d.mastery ? `, ${MASTERY_LABEL[d.mastery]}` : ""}`
                : undefined
            }
            className={cn(
              circleClass(d, catIndexById.get(d.id) ?? 7),
              "transition-[opacity,filter] duration-300",
              // Clicking an SVG shape focuses it without matching
              // :focus-visible, so the browser paints its own outline: a
              // rectangle around the bounding box, which reads as a stray
              // square on a circle. Drop it on :focus and give keyboard focus a
              // ring that follows the shape instead. outline-hidden rather than
              // outline-none so forced-colours modes still get a marker.
              "focus:outline-hidden focus-visible:stroke-ring focus-visible:stroke-3",
              dim && "opacity-15",
              hoverId === d.id && "brightness-105",
              selectedId === d.id && "stroke-ring",
            )}
            onClick={(e) => {
              e.stopPropagation();
              goto(d.id);
            }}
            onMouseEnter={() => setHoverId(d.id)}
            onMouseLeave={() => setHoverId((h) => (h === d.id ? null : h))}
            onFocus={() => setHoverId(d.id)}
            onBlur={() => setHoverId((h) => (h === d.id ? null : h))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goto(d.id);
              }
            }}
          />
        );
      }),
    [nodes, lit, focus, selectedId, hoverId, catIndexById, goto],
  );

  const counts = useMemo(() => {
    const leaves = root.leaves().map((l) => l.data);
    return {
      total: leaves.length,
      ...Object.fromEntries(
        ORDER.map((m) => [m, leaves.filter((l) => l.mastery === m).length]),
      ),
      unrelated: leaves.filter((l) => l.mastery === null).length,
    } as Record<Mastery | "total" | "unrelated", number>;
  }, [root]);

  const trail = focus.ancestors().reverse();

  return (
    <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_21rem]">
      <div className="relative h-[55vh] overflow-hidden lg:h-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onClick={() => {
            setSelectedId(null);
            setQuery("");
          }}
        >
          <g transform={transform.toString()}>
            {circles}
            {labelled.map(({ n, lines, width, px, top, locked }) => {
              const size = px / k;
              const y = top ? n.y - n.r + size * 1.1 : n.y;
              // Keep glyph plus label centred as one unit. wrapLabel measures
              // in screen pixels; everything here is world units.
              const textW = width / k;
              const glyph = size * 0.95;
              const gap = size * 0.28;
              const shift = locked ? (glyph + gap) / 2 : 0;
              return (
                <g key={`label-${n.data.id}`}>
                  {locked && (
                    <g
                      transform={`translate(${n.x - (gap + textW) / 2 - glyph / 2}, ${n.y - glyph / 2}) scale(${glyph / 24})`}
                      className="fill-none stroke-mastery-locked-fg pointer-events-none"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </g>
                  )}
                  <text
                    x={n.x + shift}
                    y={y}
                    textAnchor="middle"
                    fontSize={size}
                    className={cn(
                      "pointer-events-none select-none",
                      top
                        ? "fill-foreground font-semibold"
                        : n.data.mastery
                          ? MASTERY_TEXT[n.data.mastery]
                          : "fill-muted-foreground",
                    )}
                  >
                    {lines.map((line, i) => (
                      <tspan
                        key={line}
                        x={n.x + shift}
                        dy={
                          i === 0
                            ? top
                              ? "0em"
                              : `${-((lines.length - 1) * LINE_HEIGHT) / 2 + 0.32}em`
                            : `${LINE_HEIGHT}em`
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <nav
          aria-label="Breadcrumb"
          className="bg-card/90 absolute top-3 left-3 flex max-w-[60%] items-center gap-1 overflow-hidden rounded-md border px-2 py-1.5 text-xs backdrop-blur"
        >
          {trail.map((n, i) => (
            <span key={n.data.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <button
                type="button"
                onClick={() => goto(n.data.id)}
                className={cn(
                  "truncate rounded px-1 py-0.5",
                  n === focus
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.data.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-card/90 flex items-center gap-1.5 rounded-md border px-2 py-1.5 backdrop-blur">
              <Search className="text-muted-foreground size-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Find anything"
                aria-label="Find a category, subcategory or skill"
                className="w-32 bg-transparent text-xs outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Reset view"
              className="bg-card/90 text-muted-foreground hover:text-foreground rounded-md border p-1.5 backdrop-blur"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>

          {matches.length > 0 && (
            <ul className="bg-card/95 w-64 overflow-hidden rounded-md border text-xs backdrop-blur">
              {matches.map((m) => (
                <li key={m.data.id}>
                  <button
                    type="button"
                    onClick={() => goto(m.data.id)}
                    className="hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-left"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        m.data.altitude !== "SKILL"
                          ? CATEGORY_BAR[catIndexById.get(m.data.id) ?? 7]
                          : m.data.mastery
                            ? MASTERY_DOT[m.data.mastery]
                            : "bg-muted-foreground/40",
                      )}
                    />
                    <span className="flex-1 truncate">{m.data.name}</span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {KIND[m.data.altitude]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card/90 absolute bottom-3 left-3 rounded-md border p-3 text-xs backdrop-blur">
          <div className="mb-2 font-medium">Colour · where you stand</div>
          <ul className="space-y-1.5">
            {ORDER.map((m) => (
              <li key={m} className="flex items-center gap-2">
                {m === "locked" ? (
                  <Lock className="text-mastery-locked-fg size-2.5 shrink-0" />
                ) : (
                  <span className={`size-2.5 rounded-full ${MASTERY_DOT[m]}`} />
                )}
                <span className="text-muted-foreground">
                  {MASTERY_LABEL[m]}
                </span>
                <span className="ml-auto pl-3 tabular-nums">{counts[m]}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 opacity-50">
              <span className="bg-muted border-border size-2.5 rounded-full border" />
              <span className="text-muted-foreground">Outside your goal</span>
              <span className="ml-auto pl-3 tabular-nums">
                {counts.unrelated}
              </span>
            </li>
          </ul>
          <p className="text-muted-foreground mt-2 border-t pt-2">
            <span className="text-foreground font-medium">Size</span> · how much{" "}
            {roleName} needs it
          </p>
          <p className="text-muted-foreground mt-2 border-t pt-2 leading-relaxed">
            Click to zoom · drag to pan · scroll to scale
          </p>
        </div>
      </div>

      <aside className="overflow-auto border-t p-4 lg:border-t-0 lg:border-l">
        <TreeDetail
          node={shown.data}
          path={shown
            .ancestors()
            .slice(1)
            .reverse()
            .map((a) => a.data.name)}
          leaves={shown.leaves().map((l) => l.data)}
          categoryIndex={catIndexById.get(shown.data.id) ?? 7}
          roleName={roleName}
          lookup={lookup}
          onGoto={goto}
        />
      </aside>
    </div>
  );
}

function circleClass(d: TreeDatum, cat: number) {
  if (d.altitude === "ROOT") return "fill-card stroke-border-strong";
  if (d.altitude === "CATEGORY")
    return cn("fill-background-dim", CATEGORY_STROKE[cat]);
  if (d.altitude === "SUBCATEGORY") return "fill-background stroke-border";
  if (d.mastery) return MASTERY_CIRCLE[d.mastery];
  // Not required by the goal. Muted is the absence of a mastery state, not a
  // fifth one — a stronger border marks skills there is evidence for anyway.
  return d.level > 0
    ? "fill-muted stroke-border-strong opacity-70"
    : "fill-muted stroke-border opacity-45";
}
