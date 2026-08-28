/**
 * First thing in the tab order on every layout. Without it, reaching the page
 * content by keyboard means tabbing past the sidebar's whole nav — on every
 * navigation, since the sidebar is in the layout and never remounts.
 *
 * A plain `<a href="#…">`, not next/link: the target is on the page already,
 * and the browser's own fragment handling is what moves focus.
 */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="bg-background text-foreground outline-ring sr-only rounded-md border px-4 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:outline-2 focus:outline-offset-2"
    >
      Skip to content
    </a>
  );
}
