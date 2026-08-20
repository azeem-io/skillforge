import "server-only";

import { cache } from "react";

import { apiOrNull } from "@/lib/api";

export type SessionUser = {
  id: string;
  email: string;
  role: "student" | "mentor" | "admin";
};

/**
 * The frontend's view of who is signed in. The authority is auth-service via
 * the gateway — this never reads a cookie or a header itself, and nothing
 * downstream is written to trust one if it did.
 *
 * Request-scoped through React `cache`, so a layout, a page and the actions it
 * calls share one round trip instead of one each.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const result = await apiOrNull<{ profile: SessionUser }>("/api/profile/me");
  return result?.profile ?? null;
});
