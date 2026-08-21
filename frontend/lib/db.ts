import "server-only";

import { createDb } from "@skillforge/db";

// The last direct database read in the frontend: /ai/agent assembles the
// analyzer payload here. Every page goes through the gateway.
const url = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  __skillforgeDb?: ReturnType<typeof createDb>;
};

export function db() {
  if (!url) throw new Error("DATABASE_URL is not set.");
  globalForDb.__skillforgeDb ??= createDb(url);
  return globalForDb.__skillforgeDb;
}
