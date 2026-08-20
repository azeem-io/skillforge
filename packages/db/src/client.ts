import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";

export { schema };
export type Database = ReturnType<typeof createDb>;

// Takes the URL as an argument rather than reading the environment: every
// service imports this package, and opening a pool on import would break
// scripts and tests that only need the schema.
//
// prepare defaults to false because pooled connections (PgBouncer, Coolify's
// pooler) run in transaction mode, where prepared statements fail only under
// concurrency.
export function createDb(
  url: string,
  options: { prepare?: boolean; max?: number } = {},
) {
  const sql = postgres(url, {
    prepare: options.prepare ?? false,
    max: options.max ?? 10,
  });
  return drizzle(sql, { schema });
}
