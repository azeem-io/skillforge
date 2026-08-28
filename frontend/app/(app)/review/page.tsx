import Link from "next/link";
import { CalendarClock, CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { ReviewSession } from "@/components/review/review-session";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/student";
import { reviewSession } from "@/lib/review";

import type { Metadata } from "next";

// One student's schedule, and it changes the moment they answer.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  await requireUser();
  const { questions, skills, nextDue } = await reviewSession();

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <EmptyState icon={CheckCheck} title="Nothing is due">
          {nextDue
            ? `Your schedule is current. The next skill comes up on ${new Date(
                nextDue,
              ).toLocaleDateString()}.`
            : "Take an assessment and the skills it scores go on a review schedule from then on."}
          <br />
          <span className="mt-2 inline-block">
            Reviewing early is allowed but wasteful — the interval is the point.
          </span>
        </EmptyState>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/assessments">Browse assessments</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <CalendarClock aria-hidden className="size-3.5" />
        {skills.length} {skills.length === 1 ? "skill" : "skills"} due — spaced
        out since you last showed them, and mixed across areas on purpose.
      </p>
      <ReviewSession questions={questions} />
    </div>
  );
}
