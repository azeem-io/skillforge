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

/**
 * Persists a roadmap rather than recomputing one per request. The phases and
 * the readiness score are frozen at generation, so regenerating later shows
 * movement instead of overwriting the evidence of it.
 */
export async function generateRoadmap() {
  const result = await api<{ source: "python-analyzer" | "local" }>(
    "/api/skills/roadmap",
    { method: "POST", body: {} },
  );
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
  return result.source;
}

export async function changeUserRole(
  userId: string,
  role: "student" | "mentor" | "admin",
) {
  await api(`/api/profile/students/${userId}/role`, {
    method: "PUT",
    body: { role },
  });
  revalidatePath("/students");
}

export async function assignMentor(studentId: string, mentorId: string) {
  await api(`/api/profile/students/${studentId}/mentor`, {
    method: "PUT",
    body: { mentorId },
  });
  revalidatePath("/students");
}

export async function unassignMentor(studentId: string, mentorId: string) {
  await api(`/api/profile/students/${studentId}/mentor/${mentorId}`, {
    method: "DELETE",
  });
  revalidatePath("/students");
}
