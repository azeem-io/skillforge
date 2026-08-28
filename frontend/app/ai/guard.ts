import "server-only";

import { NextResponse } from "next/server";

import { me, type Me } from "@/lib/student";

/**
 * These three routes are the only place the frontend spends money. They call
 * ai-service, which calls DeepSeek on a key the deployment pays for, and they
 * sit outside `(app)` — so unlike every page, no layout has already turned an
 * anonymous visitor away. Without this the deployed site is an open, unmetered
 * proxy to a paid model that anyone can POST to.
 *
 * `me()` is request-cached, so the context builders re-use this call rather
 * than making a second one.
 */
export async function aiUser(): Promise<Me | NextResponse> {
  let profile: Me | null;
  try {
    profile = await me();
  } catch {
    // A gateway that is down is not a signed-out visitor, and telling them to
    // sign in would send them to a login page that cannot work either.
    return NextResponse.json(
      {
        error: "Could not verify your session.",
        hint: "The API gateway is not reachable.",
      },
      { status: 503 },
    );
  }

  if (profile) return profile;

  return NextResponse.json(
    { error: "Not signed in.", hint: "Sign in to use the assistant." },
    { status: 401 },
  );
}

/** A body that is not JSON is a 400, not an unhandled 500 in the route. */
export async function jsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
