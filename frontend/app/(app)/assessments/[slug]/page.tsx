import { notFound, redirect } from "next/navigation";

import { Quiz } from "@/components/assessment/quiz";
import { StartButton } from "@/components/assessment/start-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, ApiError, apiOrNull } from "@/lib/api";
import type { AttemptResult, Question } from "@/lib/assessment-types";
import type { Profile } from "@/lib/profile-types";

export const dynamic = "force-dynamic";

type Response = {
  assessment: { slug: string; title: string; description: string | null };
  questions: Question[];
};

export default async function AssessmentPage({
  params,
  searchParams,
}: PageProps<"/assessments/[slug]">) {
  const me = await apiOrNull<{ profile: Profile }>("/api/profile/me");
  if (!me) redirect("/login");

  const { slug } = await params;
  const { attempt } = await searchParams;

  const data = await apiOrNull<Response>(`/api/skills/assessments/${slug}`);
  if (!data) notFound();

  // Without an attempt id there is nothing to submit against, so the page
  // offers to start one rather than rendering a quiz that cannot be handed in.
  if (typeof attempt !== "string") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.assessment.title}</CardTitle>
            <CardDescription>{data.assessment.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <StartButton
              slug={slug}
              label={`Start — ${data.questions.length} questions`}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reading the attempt does two jobs: it supplies the server's `startedAt` so
  // the timer survives a refresh, and it is the ownership check — the route
  // 403s on someone else's id, so a guessed `?attempt=` never renders a quiz.
  const sitting = await api<{ result: AttemptResult }>(
    `/api/skills/attempts/${attempt}`,
  ).catch((error: unknown) => {
    // Someone else's attempt is a 403. To the person holding the URL it is
    // indistinguishable from a typo, and should read like one.
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  });

  // Already handed in. Sending them back to the paper would only let them
  // re-answer questions that are graded and cannot be submitted again.
  if (sitting.result.attempt.completedAt) {
    redirect(`/assessments/attempts/${attempt}`);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Quiz
        title={data.assessment.title}
        attemptId={attempt}
        startedAt={sitting.result.attempt.startedAt}
        questions={data.questions}
      />
    </div>
  );
}
