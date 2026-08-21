/** Shapes profile-api returns. Kept beside the UI that consumes them rather
 *  than imported from the service, which the frontend must not depend on. */

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type SkillSource =
  | "self_reported"
  | "assessment"
  | "project"
  | "certification";

export type Profile = {
  userId: string;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  headline: string | null;
  bio: string | null;
  education: string | null;
  experienceLevel: ExperienceLevel;
  targetRoleSlug: string | null;
  targetRoleName: string | null;
  cvUploadId: string | null;
  /** Null whenever cvUploadId is — they come from the same join. */
  cvFilename: string | null;
  cvMimeType: string | null;
  cvSizeBytes: number | null;
};

export type StudentSkill = {
  skillId: string;
  slug: string;
  name: string;
  level: number;
  source: SkillSource;
  evidence: string | null;
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  startedAt: string | null;
  completedAt: string | null;
  skills: { slug: string; name: string }[];
};

export type Certification = {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  credentialUrl: string | null;
};

export type Role = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
};

export const SOURCE_LABEL: Record<SkillSource, string> = {
  self_reported: "Self-reported",
  assessment: "Assessment",
  project: "Project",
  certification: "Certification",
};

/** Self-reported evidence is provisional until an assessment confirms it, and
 *  the UI says so rather than showing every claim as equally solid. */
export const SOURCE_HINT: Record<SkillSource, string> = {
  self_reported: "Take the matching assessment to confirm this level",
  assessment: "Confirmed by an assessment",
  project: "Evidenced by a project",
  certification: "Evidenced by a certification",
};

export const LEVEL_LABEL: Record<number, string> = {
  1: "Aware",
  2: "Novice",
  3: "Competent",
  4: "Proficient",
  5: "Expert",
};
