import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashboardAsk } from "@/components/ai/dashboard-ask";

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
import {
  MASTERY_CHIP,
  MASTERY_DESCRIPTION,
  MASTERY_LABEL,
  type Mastery,
} from "@/lib/mastery";
import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { FirstSteps } from "@/components/layout/first-steps";
import { DueCard } from "@/components/review/due-card";
import { dueCount } from "@/lib/review";
import { phases, readiness } from "@/lib/skills";
import { StaffOverview } from "@/components/staff/staff-overview";
import {
  mentorships,
  requireUser,
  roleGraph,
  roleOptions,
  roster,
} from "@/lib/student";

import type { Metadata } from "next";

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireUser();

  // Staff never have a target role, so every number below would be measured
  // against nothing and they would land on the goal picker instead. Note this
  // cannot call requireStaff(): that redirects a student to /dashboard, which
  // is this page.
  if (profile.role !== "student") {
    const [{ students }, pairs] = await Promise.all([
      roster(),
      // Only an admin can see who mentors whom. A mentor reading their own
      // roster already knows: it is them.
      profile.role === "admin"
        ? mentorships()
        : Promise.resolve({ mentorships: [] }),
    ]);
    return (
      <StaffOverview
        staff={profile}
        students={students}
        mentoredIds={new Set(pairs.mentorships.map((pair) => pair.studentId))}
      />
    );
  }

  const roleSlug = profile.targetRoleSlug;
  const options = await roleOptions();

  if (!roleSlug) return <GoalPicker options={options} />;

  const [{ role, skills }, due] = await Promise.all([
    roleGraph(roleSlug),
    dueCount(),
  ]);
  const score = readiness(skills);
  const layers = phases(skills);
  const nextUp = layers[0] ?? [];
  const demonstrated = skills.filter((s) => s.level > 0).length;

  const counts = ORDER.map((m) => ({
    mastery: m,
    count: skills.filter((s) => s.mastery === m).length,
  }));

  const byCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {profile.name ? `${profile.name} — working` : "Working"} toward{" "}
            <span className="text-foreground font-medium">{role.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleSwitcher options={options} current={roleSlug} />
          <Button asChild>
            <Link href="/roadmap">
              View roadmap <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <DueCard count={due} />

      {demonstrated === 0 && <FirstSteps roleName={role.name} />}

      <DashboardAsk userId={profile.userId} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>{role.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-mono text-4xl font-semibold tracking-tight">
              {score}%
            </div>
            <Progress value={score} />
            <p className="text-muted-foreground text-xs">
              Weighted by how much each skill matters to the role.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Where you stand</CardTitle>
            <CardDescription>
              {skills.length} skills on the path, across {byCategory.size}{" "}
              categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {counts.map(({ mastery, count }) => (
              <div
                key={mastery}
                className={`rounded-md px-3 py-2 ${MASTERY_CHIP[mastery]}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    {MASTERY_LABEL[mastery]}
                  </span>
                  <span className="font-mono text-lg font-semibold">
                    {count}
                  </span>
                </div>
                <p className="text-xs opacity-75">
                  {MASTERY_DESCRIPTION[mastery]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start here</CardTitle>
          <CardDescription>
            Every prerequisite is far enough along that you can begin these now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {nextUp.map((s) => (
            <Badge key={s.id} className={MASTERY_CHIP.gap}>
              {s.name}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {[...byCategory.entries()].map(([category, rows]) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{category}</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/graph">Open graph</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((s) => (
              <div key={s.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Badge variant="outline" className={MASTERY_CHIP[s.mastery]}>
                    {MASTERY_LABEL[s.mastery]}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {s.subcategory}
                </p>
                <Progress
                  className="mt-2 h-1.5"
                  value={(s.level / s.requiredLevel) * 100}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
