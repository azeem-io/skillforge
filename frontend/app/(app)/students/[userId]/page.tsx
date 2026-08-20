import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ApiError } from "@/lib/api";
import { requireStaff, studentDetail } from "@/lib/student";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  assessment: "Assessment",
  self_reported: "Self-reported",
  project: "Project",
  certification: "Certification",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireStaff();
  const { userId } = await params;

  // A mentor asking for a student who is not theirs gets a 403 from the
  // service. Surfacing that as "not found" avoids confirming the id exists.
  const detail = await studentDetail(userId).catch((error) => {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  });

  const { profile, skills } = detail;
  const byAssessment = skills.filter((s) => s.source === "assessment").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/students">
          <ArrowLeft className="size-3.5" /> Back to roster
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.name ?? profile.email}
        </h1>
        <p className="text-muted-foreground text-sm">
          {profile.email}
          {profile.targetRoleName && ` · aiming at ${profile.targetRoleName}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Experience</CardDescription>
            <CardTitle className="text-lg capitalize">
              {profile.experienceLevel ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Skills on record</CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {skills.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assessed</CardDescription>
            <CardTitle className="text-lg tabular-nums">
              {byAssessment}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {profile.education && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{profile.education}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demonstrated skills</CardTitle>
          <CardDescription>
            Where each level came from. Assessment evidence replaces a
            self-reported claim for the same skill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {skills.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nothing demonstrated yet — no assessment taken and no skills
              claimed.
            </p>
          )}
          {skills.map((skill) => (
            <div
              key={skill.slug}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            >
              <span className="min-w-40 flex-1 text-sm font-medium">
                {skill.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {SOURCE_LABEL[skill.source] ?? skill.source}
              </Badge>
              <div className="w-28">
                <Progress className="h-1.5" value={(skill.level / 5) * 100} />
              </div>
              <span className="text-muted-foreground w-16 text-right text-xs tabular-nums">
                level {skill.level}
              </span>
              {skill.evidence && (
                <p className="text-muted-foreground w-full text-xs">
                  {skill.evidence}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
