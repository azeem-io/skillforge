import { SkillGraph } from "@/components/graph/skill-graph";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROADMAP, SKILL_BY_ID, TARGET_ROLE } from "@/lib/mock";

export default function RoadmapPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-muted-foreground text-sm">
          The subgraph {TARGET_ROLE.name} requires, minus what you have already
          shown, layered by prerequisite depth.
        </p>
      </div>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_20rem]">
        <div className="h-[55vh] lg:h-auto">
          <SkillGraph mode="roadmap" />
        </div>

        <aside className="space-y-3 overflow-auto border-t p-4 lg:border-t-0 lg:border-l">
          {ROADMAP.map((p) => (
            <Card key={p.phase}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    Phase {p.phase} · {p.title}
                  </CardTitle>
                  <Badge variant="secondary">{p.estimatedWeeks}w</Badge>
                </div>
                <CardDescription>{p.rationale}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {p.skillIds.map((id) => (
                  <Badge key={id} variant="outline">
                    {SKILL_BY_ID.get(id)?.name ?? id}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}
