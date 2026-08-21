import { redirect } from "next/navigation";

import { Certifications, Projects } from "@/components/profile/portfolio";
import { CvPreview } from "@/components/profile/cv-preview";
import { CvUpload } from "@/components/profile/cv-upload";
import { ProfileForm } from "@/components/profile/profile-form";
import { SkillClaims } from "@/components/profile/skill-claims";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, apiOrNull } from "@/lib/api";

import type { Metadata } from "next";
import type {
  Certification,
  Profile,
  Project,
  Role,
  StudentSkill,
} from "@/lib/profile-types";

// Every read here is student-specific, so nothing may be cached between users.
export const dynamic = "force-dynamic";

type TaxonomySkill = { slug: string; name: string };
type Taxonomy = {
  categories: { subcategories: { skills: TaxonomySkill[] }[] }[];
};

export const metadata: Metadata = { title: "Profile · SkillForge" };

export default async function ProfilePage() {
  const me = await apiOrNull<{ profile: Profile }>("/api/profile/me");
  if (!me) redirect("/login");

  const [skills, projects, certifications, roles, taxonomy] = await Promise.all([
    api<{ skills: StudentSkill[] }>("/api/profile/skills"),
    api<{ projects: Project[] }>("/api/profile/projects"),
    api<{ certifications: Certification[] }>("/api/profile/certifications"),
    api<{ roles: Role[] }>("/api/skills/roles"),
    // The taxonomy is the same for everyone and changes only on a re-seed.
    api<Taxonomy>("/api/skills/taxonomy", { revalidate: 3600 }),
  ]);

  // Only leaves can carry a proficiency level — a level on "Web Development"
  // would have nothing in roleRequirements to compare against.
  const options = taxonomy.categories
    .flatMap((category) => category.subcategories)
    .flatMap((subcategory) => subcategory.skills)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your goal and your evidence. Both feed the gap analysis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About you</CardTitle>
          <CardDescription>
            The target role decides what the graph and the roadmap measure you
            against.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={me.profile} roles={roles.roles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
          <CardDescription>
            Claim what you already know. An assessment upgrades a claim into
            evidence and starts its review schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillClaims skills={skills.skills} options={options} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
            <CardDescription>What you have actually built.</CardDescription>
          </CardHeader>
          <CardContent>
            <Projects projects={projects.projects} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certifications</CardTitle>
            <CardDescription>Credentials worth showing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Certifications certifications={certifications.certifications} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CV</CardTitle>
          <CardDescription>
            Stored outside the repository and served back only to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CvUpload cvUploadId={me.profile.cvUploadId} />
          <CvPreview
            cvUploadId={me.profile.cvUploadId}
            cvFilename={me.profile.cvFilename}
            cvMimeType={me.profile.cvMimeType}
            cvSizeBytes={me.profile.cvSizeBytes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
