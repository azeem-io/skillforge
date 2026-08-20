import type { Mastery } from "@/lib/mastery";

export type TreeResource = {
  title: string;
  url: string | null;
  type: string;
  provider: string | null;
};

export type TreeDatum = {
  id: string;
  name: string;
  altitude: "ROOT" | "CATEGORY" | "SUBCATEGORY" | "SKILL";
  description?: string | null;
  mastery: Mastery | null;
  level: number;
  requiredLevel: number;
  weight: number;
  prerequisites?: string[];
  unlocks?: string[];
  resources?: TreeResource[];
  children?: TreeDatum[];
};

// The pack is laid out in a fixed world square and fitted to the container by
// the viewBox, so every measurement below is independent of the element size.
export const SIZE = 1000;
export const ROOT_ID = "__you";

/** Centre plus extent, the same shape d3's zoomable pack interpolates. */
export type View = { x: number; y: number; w: number };
