import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

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
import { READINESS, SKILLS, TARGET_ROLE } from "@/lib/mock";

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

export default function DashboardPage() {
  const counts = ORDER.map((m) => ({
    mastery: m,
    count: SKILLS.filter((s) => s.mastery === m).length,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Working toward{" "}
            <span className="text-foreground font-medium">
              {TARGET_ROLE.name}
            </span>
          </p>
        </div>
        <Button asChild>
          <Link href="/roadmap">
            View roadmap <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>{TARGET_ROLE.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-semibold tabular-nums">
              {READINESS}%
            </div>
            <Progress value={READINESS} />
            <p className="text-muted-foreground text-xs">
              Weighted against every skill {TARGET_ROLE.name} requires.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Where you stand</CardTitle>
            <CardDescription>
              Four states, used identically across every view.
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
                  <span className="text-lg font-semibold tabular-nums">
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Every skill on the path to {TARGET_ROLE.name}.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/graph">Open graph</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s) => (
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

      <Card className="border-ai/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-ai size-4" />
            AI career assistant
          </CardTitle>
          <CardDescription>
            Grounded in the knowledge base. Wired once ai-service lands.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
