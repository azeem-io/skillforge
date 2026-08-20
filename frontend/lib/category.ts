// Eight category slots, assigned by first-seen order so colours stay stable
// across a render. Tailwind cannot see dynamic class names, so both maps are
// written out in full.
export const CATEGORY_BAR = [
  "bg-cat-1",
  "bg-cat-2",
  "bg-cat-3",
  "bg-cat-4",
  "bg-cat-5",
  "bg-cat-6",
  "bg-cat-7",
  "bg-cat-8",
] as const;

export const CATEGORY_TEXT = [
  "text-cat-1",
  "text-cat-2",
  "text-cat-3",
  "text-cat-4",
  "text-cat-5",
  "text-cat-6",
  "text-cat-7",
  "text-cat-8",
] as const;

export function categoryIndex(category: string, order: string[]): number {
  const i = order.indexOf(category);
  return i === -1 ? 7 : i % 8;
}

export function categoryOrder(categories: string[]): string[] {
  return [...new Set(categories)].sort();
}
