"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

/**
 * The career goal is profile state, not a URL parameter — the roadmap, the
 * dashboard and the agent all read it, and it has to survive a refresh.
 */
export async function setTargetRole(slug: string) {
  await api("/api/profile/me", {
    method: "PUT",
    body: { targetRoleSlug: slug },
  });

  for (const path of ["/dashboard", "/graph", "/roadmap", "/tree"]) {
    revalidatePath(path);
  }
}
