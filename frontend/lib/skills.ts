import "server-only";

/**
 * Taxonomy maths, not taxonomy data. `phases` and `readiness` are pure
 * functions over rows the gateway already returned, which is why importing
 * `@skillforge/db` here costs nothing — the frontend holds no connection and
 * no `DATABASE_URL`.
 */
export type { SkillRow, TreeSkill } from "@skillforge/db";
export { phases, readiness } from "@skillforge/db";
