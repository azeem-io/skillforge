"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { TYPE_LABEL, type Question } from "@/lib/assessment-types";

/**
 * One question at a time, with every answer held locally until submit. The
 * whole sitting is graded server-side in one transaction — the client never
 * learns whether an answer was right while it can still change it.
 */
export function Quiz({
  title,
  attemptId,
  questions,
}: {
  title: string;
  attemptId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answerInput = useRef<HTMLInputElement>(null);

  const question = questions[index];
  const answered = Object.values(responses).filter(Boolean).length;
  const isLast = index === questions.length - 1;

  // Refocus on every question, not just the first: without this the caret is
  // left on the Next button and each question costs a click before it can be
  // typed into. Recall and cloze are typed, so the input is where a sitting
  // actually happens.
  useEffect(() => {
    answerInput.current?.focus();
  }, [index]);

  if (!question) return null;

  function setResponse(value: string) {
    setResponses((current) => ({ ...current, [question!.id]: value }));
  }

  function next() {
    setIndex((value) => Math.min(questions.length - 1, value + 1));
  }

  /**
   * Enter advances, and on the last question submits. Held on the wrapper so
   * it covers the radio group too — an MCQ answered with the arrow keys should
   * not need the mouse to move on.
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isLast) {
      if (!pending) void submit();
    } else {
      next();
    }
  }

  async function submit() {
    setPending(true);
    setError(null);

    const result = await apiFetch<{ result: { attempt: { id: string } } }>(
      `/api/skills/attempts/${attemptId}/submit`,
      {
        method: "POST",
        body: {
          answers: questions.map((item) => ({
            questionId: item.id,
            response: responses[item.id] ?? "",
          })),
        },
      },
    );

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.replace(`/assessments/attempts/${attemptId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6" onKeyDown={onKeyDown}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{title}</h1>
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
              const selected = responses[question.id] === String(choiceIndex);
              return (
                <div key={id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    id={id}
                    name={question.id}
                    value={choiceIndex}
                    checked={selected}
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
          <ChevronLeft className="size-4" /> Previous
        </Button>

        {isLast ? (
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Submit assessment
          </Button>
        ) : (
          <Button onClick={next}>
            Next <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Press <kbd className="rounded border px-1">Enter</kbd> to{" "}
        {isLast ? "submit" : "go to the next question"}.
      </p>

      {isLast && answered < questions.length && (
        <p className="text-muted-foreground text-sm">
          {questions.length - answered} unanswered. Anything left blank is marked
          wrong.
        </p>
      )}
    </div>
  );
}
