import {
  BookOpen,
  FileCode2,
  FileText,
  GraduationCap,
  Hammer,
  Video,
} from "lucide-react";

/** Mirrors the `resource_type` enum in packages/db. */
export const RESOURCE_TYPES = [
  "course",
  "article",
  "video",
  "book",
  "project",
  "documentation",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export type Resource = {
  id: string;
  title: string;
  url: string | null;
  type: ResourceType;
  provider: string | null;
  summary: string | null;
  createdAt: string;
  /** Came from the seed rather than from a mentor — seeded rows have no author. */
  seeded: boolean;
  author: { id: string; name: string | null; email: string } | null;
  skillSlug: string;
  skillName: string;
};

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  course: "Course",
  article: "Article",
  video: "Video",
  book: "Book",
  project: "Project",
  documentation: "Documentation",
};

export const RESOURCE_ICON: Record<ResourceType, typeof BookOpen> = {
  course: GraduationCap,
  article: FileText,
  video: Video,
  book: BookOpen,
  project: Hammer,
  documentation: FileCode2,
};
