import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { api, apiOrNull } from "@/lib/api";
import type { SkillRow, TreeSkill } from "@skillforge/db";

export type Me = {
  userId: string;
  email: string;
  name: string | null;
  role: "student" | "mentor" | "admin";
  headline: string | null;
  education: string | null;
  experienceLevel: string;
  targetRoleSlug: string | null;
  targetRoleName: string | null;
};

export type RoleOption = { slug: string; name: string; summary: string | null };

export const me = cache(async (): Promise<Me | null> => {
  const result = await apiOrNull<{ profile: Me }>("/api/profile/me");
  return result?.profile ?? null;
});

/** Every page inside (app) is student data, so an anonymous visit is a redirect. */
export async function requireUser(): Promise<Me> {
  const profile = await me();
  if (!profile) redirect("/login");
  return profile;
}

export const roleOptions = cache(async (): Promise<RoleOption[]> => {
  const result = await apiOrNull<{ roles: RoleOption[] }>("/api/skills/roles");
  return result?.roles ?? [];
});

/**
 * The role's required subgraph with the signed-in student's mastery on it. The
 * levels come from studentSkills, which assessments and self-reported claims
 * both write, so taking an assessment moves these nodes.
 */
export function roleGraph(roleSlug: string) {
  return api<{
    role: { name: string; summary: string | null };
    skills: SkillRow[];
    readiness: number;
  }>(`/api/skills/graph?role=${encodeURIComponent(roleSlug)}`);
}

export function roleTree(roleSlug: string) {
  return api<{
    role: { name: string; summary: string | null };
    categories: TreeSkill[];
  }>(`/api/skills/tree?role=${encodeURIComponent(roleSlug)}`);
}

/**
 * A student with no goal cannot have a roadmap — there is nothing to be ready
 * for. Pages call this and render the picker instead of guessing a role.
 */
export async function requireTargetRole() {
  const profile = await requireUser();
  return { profile, roleSlug: profile.targetRoleSlug };
}

export type RosterStudent = {
  userId: string;
  name: string | null;
  email: string;
  role: "student" | "mentor" | "admin";
  experienceLevel: string | null;
  targetRoleSlug: string | null;
  targetRoleName: string | null;
  demonstrated: number;
  readiness: number | null;
};

/** Mentors and admins only. A student reaching this is a redirect, not a 403. */
export async function requireStaff(): Promise<Me> {
  const profile = await requireUser();
  if (profile.role === "student") redirect("/dashboard");
  return profile;
}

export function roster() {
  return api<{ students: RosterStudent[] }>("/api/profile/students");
}

export function mentorships() {
  return api<{
    mentorships: {
      mentorId: string;
      studentId: string;
      mentorName: string | null;
      mentorEmail: string;
    }[];
  }>("/api/profile/mentorships");
}

export function studentDetail(userId: string) {
  return api<{
    profile: Me;
    skills: {
      slug: string;
      name: string;
      level: number;
      source: string;
      evidence: string | null;
    }[];
  }>(`/api/profile/students/${encodeURIComponent(userId)}`);
}
