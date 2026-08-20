const LINE_H = 1.15;
const MAX_LINES = 3;
// Fallback ratio for the server render, where there is no canvas to measure
// with. Close enough to keep wrapping stable until the measurer arrives.
const CHAR_W = 0.54;

export type Measure = (text: string, bold: boolean) => number;

export type WrappedLabel = { lines: string[]; width: number; height: number };

/**
 * Text width scales linearly with font size, so each string is measured once at
 * a reference size and cached. Canvas measurement costs no layout, unlike
 * getComputedTextLength on a live node.
 */
let singleton: Measure | null = null;
let built = false;

const noSubscribe = () => () => {};

/** Client snapshot for useSyncExternalStore: stable across calls, built once. */
export function getMeasure(): Measure | null {
  if (!built) {
    built = true;
    singleton = createMeasurer();
  }
  return singleton;
}

/** Server snapshot: no canvas, so wrapping falls back to the estimate. */
export function getServerMeasure(): Measure | null {
  return null;
}

export const measureStore = {
  subscribe: noSubscribe,
  get: getMeasure,
  getServer: getServerMeasure,
};

function createMeasurer(): Measure | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;

  const family =
    getComputedStyle(document.body).fontFamily || "ui-sans-serif, sans-serif";
  const REF = 100;
  const cache = new Map<string, number>();

  return (text, bold) => {
    const key = `${bold ? 1 : 0}|${text}`;
    let w = cache.get(key);
    if (w === undefined) {
      ctx.font = `${bold ? 600 : 400} ${REF}px ${family}`;
      w = ctx.measureText(text).width / REF;
      cache.set(key, w);
    }
    return w;
  };
}

export function wrapLabel(
  name: string,
  fontPx: number,
  maxWidth: number,
  measure: Measure | null,
  bold = false,
): WrappedLabel | null {
  const widthOf = (t: string) =>
    measure ? measure(t, bold) * fontPx : t.length * fontPx * CHAR_W;

  const lines: string[] = [];
  let line = "";

  for (const word of name.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === MAX_LINES) return null;
  }
  if (line) lines.push(line);

  // A single word wider than the circle cannot be broken sensibly.
  if (!lines.length || lines.some((l) => widthOf(l) > maxWidth)) return null;

  return {
    lines,
    width: Math.max(...lines.map(widthOf)),
    height: lines.length * fontPx * LINE_H,
  };
}

export const LINE_HEIGHT = LINE_H;
