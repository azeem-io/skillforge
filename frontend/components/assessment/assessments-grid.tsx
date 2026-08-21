"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";

import { StartButton } from "@/components/assessment/start-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { AssessmentSummary } from "@/lib/assessment-types";

/**
 * Filters client-side over what the page already fetched — eight assessments
 * today, never enough to justify a server round trip per keystroke.
 */
export function AssessmentsGrid({
  assessments,
}: {
  assessments: AssessmentSummary[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assessments;
    return assessments.filter((assessment) =>
      [assessment.title, assessment.description, assessment.skillName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [assessments, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assessments…"
          aria-label="Search assessments"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No assessments match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((assessment) => {
            const ratio = assessment.best
              ? assessment.best.score / assessment.best.maxScore
              : null;

            return (
              <Card key={assessment.slug} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {assessment.title}
                      </CardTitle>
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
      )}
    </div>
  );
}
