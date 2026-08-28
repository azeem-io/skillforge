/**
 * The app's own public origin. Everything else the frontend fetches is either
 * same-origin or addressed to the gateway by service name — this is only
 * needed where a crawler demands an absolute URL: metadata, robots, sitemap.
 *
 * `SITE_ADDRESS` is the same variable Caddy and `BETTER_AUTH_URL` are built
 * from, so a deploy that sets it once gets consistent links everywhere.
 */
function resolve(): string {
  const raw = (process.env.SITE_URL ?? process.env.SITE_ADDRESS ?? "").trim();
  if (!raw) return "http://localhost:3000";
  if (/^https?:\/\//.test(raw)) return raw.replace(/\/+$/, "");
  // Caddy issues from its internal CA for `localhost`, but `next dev` and the
  // published container both serve plain HTTP on 3000.
  if (raw === "localhost" || raw.startsWith("localhost:")) {
    return "http://localhost:3000";
  }
  return `https://${raw}`;
}

export const SITE_URL = resolve();

/**
 * The link-preview card, rendered from `docs/og-card.html`. Repeated on every
 * page that sets its own `openGraph`: Next replaces the parent's block
 * wholesale rather than merging field by field, so a page that overrides the
 * title and omits this ships no image at all.
 */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "SkillForge — from where you are to the role you want",
} as const;

/** Public pages only. Everything under `(app)` is one student's own data. */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/privacy",
  "/terms",
] as const;
