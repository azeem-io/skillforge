import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * `useSyncExternalStore` rather than an effect: the viewport is an external
 * store, and subscribing to it directly means no first render is spent holding
 * a value the browser could already have told us.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // The server has no viewport. Desktop is the safer default: the sidebar
    // renders expanded and folds away on hydration, which is quieter than a
    // mobile drawer flashing open on a desktop first paint.
    () => false,
  );
}
