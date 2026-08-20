"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { select } from "d3-selection";
import {
  zoom as d3Zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
// Registers selection.transition(), which is what animates zoom.transform.
import "d3-transition";

import { SIZE } from "./types";

const FLY_MS = 750;
const SCALE_EXTENT: [number, number] = [0.55, 60];
// Leaves a margin so a focused circle is not flush against the viewport edge.
const FIT = 0.92;

const fit = (x: number, y: number, r: number) =>
  zoomIdentity
    .translate(SIZE / 2, SIZE / 2)
    .scale((SIZE * FIT) / (r * 2))
    .translate(-x, -y);

export const ROOT_TRANSFORM = fit(SIZE / 2, SIZE / 2, SIZE / 2);

/**
 * Drag, wheel and pinch come from d3-zoom; flyTo drives the same behaviour
 * programmatically, so a click-to-focus can be grabbed and redirected
 * mid-flight instead of fighting the user.
 */
export function useZoom(svgRef: RefObject<SVGSVGElement | null>) {
  const [transform, setTransform] = useState<ZoomTransform>(ROOT_TRANSFORM);
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // A drag ends in a click event; without this every pan would also select
  // whatever circle the pointer came to rest on.
  const dragged = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const z = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .on("start", () => {
        dragged.current = false;
      })
      .on("zoom", (e) => {
        setTransform(e.transform);
        const type = e.sourceEvent?.type;
        if (type === "mousemove" || type === "touchmove")
          dragged.current = true;
      });

    behavior.current = z;
    const s = select(svg);
    s.call(z);
    s.call(z.transform, ROOT_TRANSFORM);

    // Swallow the click that ends a pan, in the capture phase so React never
    // dispatches it. Callers then need no drag guard of their own.
    const swallowDragClick = (e: MouseEvent) => {
      if (!dragged.current) return;
      e.stopPropagation();
      dragged.current = false;
    };
    svg.addEventListener("click", swallowDragClick, true);

    return () => {
      s.on(".zoom", null);
      svg.removeEventListener("click", swallowDragClick, true);
    };
  }, [svgRef]);

  const flyTo = useCallback(
    (x: number, y: number, r: number) => {
      const svg = svgRef.current;
      const z = behavior.current;
      if (!svg || !z) return;

      const s = select(svg);
      const target = fit(x, y, r);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) s.call(z.transform, target);
      else s.transition().duration(FLY_MS).call(z.transform, target);
    },
    [svgRef],
  );

  return { transform, flyTo };
}
