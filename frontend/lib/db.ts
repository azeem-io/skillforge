import "server-only";

import { createDb } from "@skillforge/db";

// Temporary. Reads move behind skill-service and the frontend calls the
// gateway instead; the row shapes the pages consume stay the same.
const url = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  __skillforgeDb?: ReturnType<typeof createDb>;
};

export function db() {
  if (!url) throw new Error("DATABASE_URL is not set.");
  globalForDb.__skillforgeDb ??= createDb(url);
  return globalForDb.__skillforgeDb;
}
