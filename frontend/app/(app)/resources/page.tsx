import {
  ResourceLibrary,
  type SkillGroup,
} from "@/components/staff/resource-library";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { requireStaff, resourceLibrary } from "@/lib/student";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Taxonomy = {
  categories: {
    name: string;
    subcategories: { name: string; skills: { slug: string; name: string }[] }[];
  }[];
};

export const metadata: Metadata = { title: "Resources · SkillForge" };

export default async function ResourcesPage() {
  const staff = await requireStaff();

  const [taxonomy, library] = await Promise.all([
    // The taxonomy is the same for everyone and changes only on a re-seed.
    api<Taxonomy>("/api/skills/taxonomy", { revalidate: 3600 }),
    resourceLibrary(),
  ]);

  // Grouped rather than one flat list of 124: the subcategory is how a mentor
  // knows which "Testing" they are looking at.
  const groups: SkillGroup[] = taxonomy.categories.flatMap((category) =>
    category.subcategories
      .filter((subcategory) => subcategory.skills.length > 0)
      .map((subcategory) => ({
        label: `${category.name} · ${subcategory.name}`,
        skills: subcategory.skills
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Learning resources
        </h1>
        <p className="text-muted-foreground text-sm">
          What students are pointed at. A resource hangs off one skill, so it
          reaches them through that skill&apos;s detail panel and through any
          roadmap phase that includes it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a resource</CardTitle>
          <CardDescription>
            Courses, articles, videos, books, documentation — or a project
            brief, which is what the roadmap recommends students build.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceLibrary
            groups={groups}
            resources={library.resources}
            viewer={{ userId: staff.userId, role: staff.role }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
