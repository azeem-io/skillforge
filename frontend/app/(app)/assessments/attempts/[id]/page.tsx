import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, X } from "lucide-react";

import { ResultCard } from "@/components/assessment/result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiOrNull } from "@/lib/api";
import { TYPE_LABEL, type AttemptResult } from "@/lib/assessment-types";
import type { Profile } from "@/lib/profile-types";

export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: PageProps<"/assessments/attempts/[id]">) {
  const me = await apiOrNull<{ profile: Profile }>("/api/profile/me");
  if (!me) redirect("/login");

  const { id } = await params;
  const data = await apiOrNull<{ result: AttemptResult }>(
    `/api/skills/attempts/${id}`,
  );
  if (!data) notFound();

  const { result } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Result</h1>
          <p className="text-muted-foreground text-sm">
            Your weakest skills are listed first — those are the ones the roadmap
            will schedule next.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/roadmap">See the roadmap</Link>
        </Button>
      </div>

      <ResultCard result={result} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {result.answers.map((answer) => (
              <li key={answer.questionId} className="space-y-2">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      answer.isCorrect
                        ? "bg-mastery-mastered-bg text-mastery-mastered-fg"
                        : "bg-mastery-gap-bg text-mastery-gap-fg"
                    }`}
                  >
                    {answer.isCorrect ? (
                      <Check className="size-3" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      {answer.ordinal}. {answer.question}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{TYPE_LABEL[answer.type]}</Badge>
                      {answer.skillName && (
                        <Badge variant="secondary">{answer.skillName}</Badge>
                      )}
                      <span className="sr-only">
                        {answer.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-sm">
                      You answered:{" "}
                      <span className="text-foreground">
                        {formatResponse(answer)}
                      </span>
                    </p>

                    {!answer.isCorrect && (
                      <p className="text-muted-foreground text-sm">
                        Correct answer:{" "}
                        <span className="text-foreground">
                          {formatCorrect(answer)}
                        </span>
                      </p>
                    )}

                    {answer.explanation && (
                      <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm">
                        {answer.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

/** MCQ responses are stored as choice indices, so they need resolving back to
 *  the text the student actually clicked. */
function formatResponse(answer: AttemptResult["answers"][number]): string {
  if (!answer.response) return "— nothing —";
  if (answer.type !== "mcq" || !answer.choices) return answer.response;
  return (
    answer.response
      .split(",")
      .map((index) => answer.choices?.[Number(index.trim())])
      .filter(Boolean)
      .join(", ") || "— nothing —"
  );
}

function formatCorrect(answer: AttemptResult["answers"][number]): string {
  if (answer.type === "mcq" && answer.choices && answer.correct) {
    return answer.correct
      .map((index) => answer.choices?.[index])
      .filter(Boolean)
      .join(", ");
  }
  // The bank stores acceptable answers pipe-separated; the first is canonical.
  return answer.answer?.split("|")[0] ?? "—";
}
