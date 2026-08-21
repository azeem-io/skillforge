import Link from "next/link";
import {
  ArrowRight,
  CircleSlash,
  Compass,
  Library,
  TriangleAlert,
  Users,
} from "lucide-react";

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
import { blockerFor, type Blocker } from "@/lib/staff";
import type { Me, RosterStudent } from "@/lib/student";

// A triage list everyone is on is not a triage list. The rest are one click
// away under the roster's "Needs attention" filter, which shares this rule.
const SHOWN = 6;

function Tile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-2xl tabular-nums">
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

export function StaffOverview({
  staff,
  students,
  mentoredIds,
}: {
  staff: Me;
  students: RosterStudent[];
  /** Student ids with at least one mentor. Empty for a mentor — they are it. */
  mentoredIds: Set<string>;
}) {
  const isAdmin = staff.role === "admin";

  // An admin's roster is everyone, mentors and admins included. They are
  // colleagues, not people to review, so every number below is about students.
  const learners = students.filter((s) => s.role === "student");
  const colleagues = students.filter((s) => s.role !== "student");

  const withGoal = learners.filter((s) => s.targetRoleSlug);
  const started = learners.filter((s) => s.demonstrated > 0);
  const scored = learners.filter((s) => s.readiness !== null);
  const averageReadiness = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.readiness ?? 0), 0) / scored.length)
    : null;

  const blocked = learners
    .map((student) => ({
      student,
      blocker: blockerFor(
        student,
        isAdmin ? mentoredIds.has(student.userId) : true,
      ),
    }))
    .filter((row): row is { student: RosterStudent; blocker: Blocker } =>
      Boolean(row.blocker),
    );

  const moving = scored
    .filter((s) => (s.readiness ?? 0) >= 25)
    .sort((a, b) => (b.readiness ?? 0) - (a.readiness ?? 0))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {isAdmin ? "Administration" : "Mentoring"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? "Everyone on the platform, and where each student is stuck."
            : "The students assigned to you, and where each one is stuck."}
        </p>
      </div>

      {learners.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-muted-foreground size-4" />
              {isAdmin ? "No students yet" : "Nobody assigned yet"}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Everyone who registers arrives as a student. Once somebody signs up they appear here."
                : "An admin assigns students to a mentor. Until then there is nothing to review."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label={isAdmin ? "Students" : "Assigned"}
              value={String(learners.length)}
              sub={
                isAdmin && colleagues.length > 0
                  ? `plus ${colleagues.length} mentor${colleagues.length === 1 ? "" : "s"} and admin${colleagues.length === 1 ? "" : "s"}`
                  : undefined
              }
              icon={Users}
            />
            <Tile
              label="Goal set"
              value={`${withGoal.length}/${learners.length}`}
              sub={
                withGoal.length < learners.length
                  ? `${learners.length - withGoal.length} cannot get a roadmap yet`
                  : "everyone has a target role"
              }
              icon={Compass}
            />
            <Tile
              label="Started"
              value={`${started.length}/${learners.length}`}
              sub="have demonstrated at least one skill"
              icon={CircleSlash}
            />
            <Tile
              label="Average readiness"
              value={averageReadiness === null ? "—" : `${averageReadiness}%`}
              sub={
                scored.length
                  ? `across ${scored.length} with a goal`
                  : "nobody has a goal yet"
              }
              icon={ArrowRight}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TriangleAlert className="text-mastery-gap-ring size-4" />
                Needs attention
              </CardTitle>
              <CardDescription>
                {blocked.length === 0
                  ? "Nobody is blocked. Every student has a goal, has started, and is past the first quarter."
                  : "One reason each, in the order worth fixing."}
              </CardDescription>
            </CardHeader>
            {blocked.length > 0 && (
              <CardContent className="space-y-2">
                {blocked.slice(0, SHOWN).map(({ student, blocker }) => (
                  <Link
                    key={student.userId}
                    href={`/students/${student.userId}`}
                    className="hover:bg-muted/60 focus-visible:ring-ring flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="min-w-40 flex-1 truncate text-sm font-medium">
                      {student.name ?? student.email}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-mastery-gap-bg text-mastery-gap-fg"
                    >
                      {blocker.label}
                    </Badge>
                    <span className="text-muted-foreground w-full text-xs sm:w-auto sm:flex-1">
                      {blocker.hint}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                  </Link>
                ))}

                {blocked.length > SHOWN && (
                  <Link
                    href="/students"
                    className="text-muted-foreground hover:text-foreground block px-3 pt-1 text-xs underline underline-offset-2"
                  >
                    {blocked.length - SHOWN} more need attention — open the
                    roster
                  </Link>
                )}
              </CardContent>
            )}
          </Card>

          {moving.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Furthest along</CardTitle>
                <CardDescription>
                  Readiness against the goal each one chose.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {moving.map((student) => (
                  <div key={student.userId} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/students/${student.userId}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {student.name ?? student.email}
                      </Link>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {student.readiness}% · {student.targetRoleName}
                      </span>
                    </div>
                    <Progress value={student.readiness ?? 0} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/students">
            <Users className="size-4" />
            {isAdmin ? "Manage everyone" : "My students"}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/resources">
            <Library className="size-4" />
            Resource library
          </Link>
        </Button>
      </div>
    </div>
  );
}
