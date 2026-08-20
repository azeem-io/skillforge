import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { StartButton } from "@/components/assessment/start-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, apiOrNull } from "@/lib/api";
import type { AssessmentSummary } from "@/lib/assessment-types";
import type { Profile } from "@/lib/profile-types";

export const dynamic = "force-dynamic";

type Attempt = {
  id: string;
  slug: string;
  title: string;
  score: number | null;
  maxScore: number | null;
  completedAt: string | null;
};

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
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground text-sm">
          Each sitting scores per skill, not just overall — that breakdown is what
          the gap analysis reads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {assessments.map((assessment) => {
          const ratio = assessment.best
            ? assessment.best.score / assessment.best.maxScore
            : null;

          return (
            <Card key={assessment.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{assessment.title}</CardTitle>
                    <CardDescription>{assessment.description}</CardDescription>
                  </div>
                  <ClipboardCheck className="text-muted-foreground size-5 shrink-0" />
                </div>
              </CardHeader>

              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {assessment.questionCount} questions
                  </Badge>
                  {assessment.best && (
                    <Badge variant="secondary">
                      Best {assessment.best.score}/{assessment.best.maxScore}
                    </Badge>
                  )}
                </div>

                {ratio !== null && <Progress value={ratio * 100} />}

                <StartButton
                  slug={assessment.slug}
                  label={assessment.best ? "Retake" : "Start"}
                  variant={assessment.best ? "outline" : "default"}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{attempt.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {attempt.completedAt &&
                        new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums">
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
