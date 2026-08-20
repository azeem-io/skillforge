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
import { DEMO_DEMONSTRATED, DEMO_TARGET_ROLE } from "@/lib/demo-student";
import { phases, readiness, roleGraph } from "@/lib/skills";

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

// Reads live data per request; without this Next bakes the build-time rows in.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { role, skills } = await roleGraph(DEMO_TARGET_ROLE, DEMO_DEMONSTRATED);
  const score = readiness(skills);
  const layers = phases(skills);
  const nextUp = layers[0] ?? [];

  const counts = ORDER.map((m) => ({
    mastery: m,
    count: skills.filter((s) => s.mastery === m).length,
  }));

  const byCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Working toward{" "}
            <span className="text-foreground font-medium">{role.name}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/roadmap">
            View roadmap <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>{role.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-semibold tabular-nums">{score}%</div>
            <Progress value={score} />
            <p className="text-muted-foreground text-xs">
              Weighted by how much each skill matters to the role.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Where you stand</CardTitle>
            <CardDescription>
              {skills.length} skills on the path, across {byCategory.size}{" "}
              categories.
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
          <CardTitle>Start here</CardTitle>
          <CardDescription>
            Nothing blocks these — every prerequisite is already met.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {nextUp.map((s) => (
            <Badge key={s.id} className={MASTERY_CHIP.gap}>
              {s.name}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {[...byCategory.entries()].map(([category, rows]) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{category}</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/graph">Open graph</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((s) => (
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
      ))}

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
