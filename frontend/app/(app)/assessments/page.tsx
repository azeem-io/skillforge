import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentsGrid } from "@/components/assessment/assessments-grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, apiOrNull } from "@/lib/api";
import type { AssessmentSummary } from "@/lib/assessment-types";
import type { Profile } from "@/lib/profile-types";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Attempt = {
  id: string;
  slug: string;
  title: string;
  score: number | null;
  maxScore: number | null;
  completedAt: string | null;
};

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const me = await apiOrNull<{ profile: Profile }>("/api/profile/me");
  if (!me) redirect("/login");

  const [{ assessments }, { attempts }] = await Promise.all([
    api<{ assessments: AssessmentSummary[] }>("/api/skills/assessments"),
    api<{ attempts: Attempt[] }>("/api/skills/attempts"),
  ]);

  const recent = attempts.filter((attempt) => attempt.completedAt).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <p className="text-muted-foreground text-sm">
          Each sitting scores per skill, not just overall — that breakdown is what
          the gap analysis reads.
        </p>
      </div>

      <AssessmentsGrid assessments={assessments} />

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent attempts</CardTitle>
            <CardDescription>
              Retaking one moves the skills it covers back up the schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-border divide-y">
              {recent.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{attempt.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {attempt.completedAt &&
                        new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm">
                      {attempt.score}/{attempt.maxScore}
                    </span>
                    <Link
                      href={`/assessments/attempts/${attempt.id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
