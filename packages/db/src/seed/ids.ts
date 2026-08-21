import { createHash } from "node:crypto";

/**
 * A stable uuid derived from a slug, so re-seeding updates rows in place
 * instead of orphaning anything that references them. Shared by the reference
 * seed and the demo seed, which key different kinds against the same scheme.
 */
export function idFor(kind: string, slug: string): string {
  const h = createHash("sha1").update(`${kind}:${slug}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join("-");
}
