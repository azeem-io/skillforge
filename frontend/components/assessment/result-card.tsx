import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  masteryForRatio,
  type AttemptResult,
  type SkillBreakdown,
} from "@/lib/assessment-types";
import { durationBetween } from "@/lib/duration";
import { MASTERY_CHIP, MASTERY_DOT } from "@/lib/mastery";
import { LEVEL_LABEL } from "@/lib/profile-types";

/**
 * Standalone on purpose: the dashboard imports this rather than reaching into
 * the assessments page, which keeps both owners out of dashboard/page.tsx at
 * the same time.
 */
export function ResultCard({
  result,
  href,
}: {
  result: AttemptResult;
  href?: string;
}) {
  const { attempt, breakdown } = result;
  const score = attempt.score ?? 0;
  const max = attempt.maxScore ?? 0;
  const ratio = max ? score / max : 0;
  const took = durationBetween(attempt.startedAt, attempt.completedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{attempt.title}</CardTitle>
            <CardDescription>
              {attempt.completedAt
                ? `Completed ${new Date(attempt.completedAt).toLocaleDateString()}`
                : "In progress"}
              {took && <> · took {took}</>}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold tracking-tight">
              {score}
              <span className="text-muted-foreground text-base">/{max}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {Math.round(ratio * 100)}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={ratio * 100} />

        {breakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Per-skill breakdown
            </p>
            <ul className="space-y-1.5">
              {breakdown.map((entry) => (
                <BreakdownRow key={entry.slug} entry={entry} linkSkill />
              ))}
            </ul>
          </div>
        )}

        {href && (
          <Link
            href={href}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            Review answers <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exported because the mentor view lists the same breakdown without the rest
 * of the card, and two renderings of "how well did this skill go" would drift
 * apart in what mastered looks like.
 *
 * `linkSkill` is opt-in for exactly that reason: the graph a link would open
 * is the *viewer's* own, which is right for a student reading their own
 * result and meaningless for a mentor reading someone else's.
 */
export function BreakdownRow({
  entry,
  linkSkill = false,
}: {
  entry: SkillBreakdown;
  linkSkill?: boolean;
}) {
  const ratio = entry.total ? entry.correct / entry.total : 0;
  const mastery = masteryForRatio(ratio);

  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${MASTERY_DOT[mastery]}`}
        />
        {linkSkill ? (
          <Link
            href={`/graph?skill=${encodeURIComponent(entry.slug)}`}
            className="hover:text-primary truncate hover:underline"
            title={`Open ${entry.name} in the graph`}
          >
            {entry.name}
          </Link>
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-muted-foreground font-mono">
          {entry.correct}/{entry.total}
        </span>
        <Badge className={MASTERY_CHIP[mastery]} variant="secondary">
          {LEVEL_LABEL[entry.level]}
        </Badge>
      </span>
    </li>
  );
}
