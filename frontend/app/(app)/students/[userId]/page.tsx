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
import { api, ApiError } from "@/lib/api";
import {
  requireStaff,
  roster,
  studentAttempts,
  studentDetail,
} from "@/lib/student";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Student" };

const SOURCE_LABEL: Record<string, string> = {
  assessment: "Assessment",
  self_reported: "Self-reported",
  project: "Project",
  certification: "Certification",
};

type Taxonomy = {
  categories: {
    name: string;
    subcategories: { name: string; skills: { slug: string; name: string }[] }[];
  }[];
};

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-lg tabular-nums capitalize">
          {value}
        </CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-xs">{sub}</p>
        </CardContent>
      )}
    </Card>
  );
}

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
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  });

  const [taxonomy, { students }, history] = await Promise.all([
    // Same for everyone, changes only on a re-seed — so this is a cache hit.
    api<Taxonomy>("/api/skills/taxonomy", { revalidate: 3600 }),
    // Readiness is computed per-student inside profile-api's roster query.
    // /api/skills/graph cannot stand in for it: that endpoint answers with the
    // *caller's* mastery, so a mentor would be shown their own progress under
    // the student's name.
    roster(),
    // A panel that cannot load must not take the profile down with it — the
    // authorization here is the same join that already let the page render.
    studentAttempts(userId).catch(() => null),
  ]);

  const { profile, skills } = detail;
  const summary = students.find((student) => student.userId === userId);
  const byAssessment = skills.filter((s) => s.source === "assessment").length;
  const completed = history?.attempts.filter((a) => a.completedAt) ?? [];

  // slug → "Category · Subcategory", so demonstrated skills can be grouped the
  // way the rest of the app groups them.
  const groupOf = new Map<string, string>();
  for (const category of taxonomy.categories)
    for (const subcategory of category.subcategories)
      for (const skill of subcategory.skills)
        groupOf.set(skill.slug, `${category.name} · ${subcategory.name}`);

  const grouped = new Map<string, typeof skills>();
  for (const skill of skills) {
    const key = groupOf.get(skill.slug) ?? "Other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(skill);
  }
  const groups = [...grouped.entries()]
    .map(([label, list]) => ({
      label,
      // Strongest first: a mentor scanning for what a student can already do
      // should not have to read past the level 1s.
      list: list.slice().sort((a, b) => b.level - a.level),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

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

      {summary?.readiness !== null && summary?.readiness !== undefined ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle className="text-base">
                Readiness for {profile.targetRoleName}
              </CardTitle>
              <span className="font-mono text-2xl tabular-nums">
                {summary.readiness}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={summary.readiness} className="h-2" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">No goal set</CardTitle>
            <CardDescription>
              Readiness is measured against a target role. Until they pick one
              there is nothing to measure, and no roadmap can be generated.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Experience" value={profile.experienceLevel ?? "—"} />
        <Tile
          label="Skills on record"
          value={String(skills.length)}
          sub={`across ${groups.length} area${groups.length === 1 ? "" : "s"}`}
        />
        <Tile
          label="Assessed"
          value={String(byAssessment)}
          sub={
            skills.length > 0
              ? `${skills.length - byAssessment} self-reported`
              : undefined
          }
        />
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
        <CardContent className="space-y-5">
          {skills.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nothing demonstrated yet — no assessment taken and no skills
              claimed.
            </p>
          )}

          {groups.map(({ label, list }) => (
            <div key={label} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </h3>
              {list.map((skill) => (
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
                    <Progress
                      className="h-1.5"
                      value={(skill.level / 5) * 100}
                    />
                  </div>
                  <span className="text-muted-foreground w-16 text-right font-mono text-xs tabular-nums">
                    level {skill.level}
                  </span>
                  {skill.evidence && (
                    <p className="text-muted-foreground w-full text-xs">
                      {skill.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
