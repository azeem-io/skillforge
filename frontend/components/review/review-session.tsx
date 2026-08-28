"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { TYPE_LABEL, type Question } from "@/lib/assessment-types";
import type { ReviewResult } from "@/lib/review";
import { cn } from "@/lib/utils";

/**
 * A review session: retrieval practice over the skills FSRS says have decayed.
 *
 * The interaction deliberately matches the assessment quiz — same Enter-to-
 * advance, same autofocus — because it is the same act. What differs is what
 * it does: a sitting measures a level, a review moves a schedule.
 */
export function ReviewSession({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const answerInput = useRef<HTMLInputElement>(null);
  const question = questions[index];
  const answered = Object.values(responses).filter(Boolean).length;
  const isLast = index === questions.length - 1;

  useEffect(() => {
    answerInput.current?.focus();
  }, [index]);

  if (result) return <ReviewSummary result={result} />;
  if (!question) return null;

  function setResponse(value: string) {
    setResponses((current) => ({ ...current, [question!.id]: value }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isLast) {
      if (!pending) void submit();
    } else {
      setIndex((value) => Math.min(questions.length - 1, value + 1));
    }
  }

  async function submit() {
    setPending(true);
    setError(null);

    const response = await apiFetch<ReviewResult>("/api/skills/review/submit", {
      method: "POST",
      body: {
        answers: questions.map((item) => ({
          questionId: item.id,
          response: responses[item.id] ?? "",
        })),
      },
    });

    if (!response.ok) {
      setError(response.error);
      setPending(false);
      return;
    }

    setResult(response.data);
    // The dashboard nudge and the sidebar both count what is due.
    router.refresh();
  }

  return (
    <div className="space-y-6" onKeyDown={onKeyDown}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Review</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {index + 1} of {questions.length}
          </p>
        </div>
        <Progress value={(answered / questions.length) * 100} />
        <p className="text-muted-foreground text-xs">
          {answered} of {questions.length} answered
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TYPE_LABEL[question.type]}</Badge>
          {question.skillName && (
            <Badge variant="outline">{question.skillName}</Badge>
          )}
        </div>

        <p className="text-base font-medium">{question.question}</p>

        {question.type === "mcq" && question.choices ? (
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose an answer</legend>
            {question.choices.map((choice, choiceIndex) => {
              const id = `${question.id}-${choiceIndex}`;
              return (
                <div key={id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    id={id}
                    name={question.id}
                    value={choiceIndex}
                    checked={responses[question.id] === String(choiceIndex)}
                    onChange={() => setResponse(String(choiceIndex))}
                    className="accent-primary mt-1"
                  />
                  <Label htmlFor={id} className="cursor-pointer font-normal">
                    {choice}
                  </Label>
                </div>
              );
            })}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`answer-${question.id}`}>Your answer</Label>
            <Input
              ref={answerInput}
              id={`answer-${question.id}`}
              value={responses[question.id] ?? ""}
              onChange={(event) => setResponse(event.target.value)}
              autoComplete="off"
              placeholder={
                question.type === "cloze" ? "The missing word" : "Your answer"
              }
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          Previous
        </Button>
        {isLast ? (
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Finish review
          </Button>
        ) : (
          <Button onClick={() => setIndex((value) => value + 1)}>
            Next <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Press <kbd className="rounded border px-1">Enter</kbd> to{" "}
        {isLast ? "finish" : "go to the next question"}. Answering from memory is
        the point — looking it up first is what makes review stop working.
      </p>
    </div>
  );
}

/**
 * What the session did to the schedule. The next interval per skill is the
 * whole payoff: it is the system saying when this will be worth your time
 * again, and it is the only place a student sees the algorithm reason.
 */
function ReviewSummary({ result }: { result: ReviewResult }) {
  const held = result.results.filter((row) => !row.lapsed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Review done</h1>
        <p className="text-muted-foreground text-sm">
          {held} of {result.results.length} skills held. Each one is rescheduled
          for when it is next likely to be slipping — open any of them for what
          to read before it comes back.
        </p>
      </div>

      <ul className="divide-border divide-y rounded-lg border">
        {result.results.map((row) => (
          <li
            key={row.slug}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2">
              {row.lapsed ? (
                <X className="text-destructive size-4 shrink-0" />
              ) : (
                <Check className="text-success size-4 shrink-0" />
              )}
              <Link
                href={`/graph?skill=${encodeURIComponent(row.slug)}`}
                className="hover:text-primary truncate text-sm font-medium hover:underline"
                title={`Open ${row.name} in the graph`}
              >
                {row.name}
              </Link>
              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                {row.correct}/{row.total}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              {row.recognitionOnly && (
                <Badge
                  variant="outline"
                  className="font-normal"
                  title="Multiple choice only — recognising an answer is weaker evidence than producing one, so the interval is shortened."
                >
                  recognition
                </Badge>
              )}
              <Badge variant="secondary">{row.gradeLabel}</Badge>
              <span
                className={cn(
                  "flex items-center gap-1 font-mono text-xs",
                  row.lapsed ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <Clock className="size-3" />
                {row.intervalLabel}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {result.answers.some((answer) => !answer.isCorrect) && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">What you missed</h2>
          <ul className="space-y-2">
            {result.answers
              .filter((answer) => !answer.isCorrect)
              .map((answer) => (
                <li
                  key={answer.questionId}
                  className="rounded-md border p-3 text-sm"
                >
                  {answer.answer && (
                    <p>
                      <span className="text-muted-foreground">Answer: </span>
                      <span className="font-medium">
                        {answer.answer.split("|")[0]}
                      </span>
                    </p>
                  )}
                  {answer.explanation && (
                    <p className="text-muted-foreground mt-1 text-xs leading-snug">
                      {answer.explanation}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {result.remaining > 0 ? (
          <Button asChild>
            <Link href="/review">
              <RotateCcw className="size-4" />
              Review {result.remaining} more
            </Link>
          </Button>
        ) : (
          <EmptyState compact icon={Check} title="Nothing else is due">
            Everything on your schedule is current.
          </EmptyState>
        )}
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            Back to dashboard <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
