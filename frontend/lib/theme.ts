/**
 * The full dark palette has been in `globals.css` since the design tokens
 * landed, and every shadcn primitive carries its `dark:` variants — but
 * nothing ever put the `.dark` class on the document, so none of it was
 * reachable. This is the switch.
 */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = "skillforge-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * A tiny store over localStorage so the toggle can read the saved theme with
 * `useSyncExternalStore` instead of correcting itself in an effect. The
 * `storage` event covers other tabs; the listener set covers this one, which
 * the event deliberately does not fire in.
 */
const listeners = new Set<() => void>();

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Returns a primitive, so `useSyncExternalStore` can compare it by value. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Site data blocked. The default is still correct.
    return "system";
  }
}

export function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The theme still applies for this page; it just will not be remembered.
  }
  applyTheme(theme);
  for (const listener of listeners) listener();
}

/** Resolves `system` against the OS, and applies the result to `<html>`. */
export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  // Native controls, form widgets and the scrollbar gutter read this, not the
  // class. Without it a dark page still gets light checkboxes.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Runs before first paint, inlined in <head>. Anything React does happens after
 * the browser has already painted the light palette, so without this a dark
 * theme arrives as a flash of white on every navigation-free page load.
 *
 * It also marks the document as scripted. Scroll reveals start hidden, and a
 * visitor with JavaScript disabled must not be served an invisible page — the
 * `.js` class is what gates every one of those rules, so without it the page
 * renders complete and static.
 *
 * Wrapped in try/catch because reading localStorage throws outright when a
 * browser is set to block site data, and a theme preference is not worth a
 * blank page.
 */
export const THEME_SCRIPT = `
(function(){
document.documentElement.classList.add("js");
try{
var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"system";
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();
`.trim();
