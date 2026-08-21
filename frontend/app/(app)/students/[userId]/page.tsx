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
import { BreakdownRow } from "@/components/assessment/result-card";
import { ApiError } from "@/lib/api";
import { requireStaff, studentAttempts, studentDetail } from "@/lib/student";

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

  // A panel that cannot load must not take the profile down with it — the
  // authorization here is the same join that already let the page render.
  const history = await studentAttempts(userId).catch(() => null);

  const { profile, skills } = detail;
  const byAssessment = skills.filter((s) => s.source === "assessment").length;
  const completed = history?.attempts.filter((a) => a.completedAt) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/students">
          <ArrowLeft className="size-3.5" /> Back to roster
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">
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
            <CardTitle className="font-mono text-lg">
              {skills.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assessed</CardDescription>
            <CardTitle className="font-mono text-lg">
              {byAssessment}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessments</CardTitle>
          <CardDescription>
            Every sitting, most recent first. Scores are graded evidence — this
            is where the levels below came from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!history && (
            <p className="text-muted-foreground text-sm">
              Assessment history could not be loaded just now.
            </p>
          )}

          {history && completed.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No assessment taken yet. Nothing here is graded evidence until
              one is.
            </p>
          )}

          {completed.map((attempt) => {
            const ratio =
              attempt.maxScore && attempt.score !== null
                ? attempt.score / attempt.maxScore
                : 0;
            return (
              <div
                key={attempt.id}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3"
              >
                <span className="min-w-40 flex-1 text-sm font-medium">
                  {attempt.title}
                </span>
                <span className="text-muted-foreground text-xs">
                  {attempt.completedAt &&
                    new Date(attempt.completedAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                </span>
                <div className="w-28">
                  <Progress className="h-1.5" value={ratio * 100} />
                </div>
                <span className="w-16 text-right font-mono text-xs">
                  {attempt.score}/{attempt.maxScore}
                </span>
              </div>
            );
          })}

          {history && history.breakdown.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Weakest skills in the most recent sitting
              </p>
              <ul className="space-y-1.5">
                {history.breakdown.slice(0, 6).map((entry) => (
                  <BreakdownRow key={entry.slug} entry={entry} />
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

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
              <span className="text-muted-foreground w-16 text-right font-mono text-xs">
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
