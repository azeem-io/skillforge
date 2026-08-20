import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkillGraph } from "@/components/graph/skill-graph";
import { DEMO_DEMONSTRATED, DEMO_TARGET_ROLE } from "@/lib/demo-student";
import { phases, roleGraph } from "@/lib/skills";

// Reads live data per request; without this Next bakes the build-time rows in.
export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { role, skills } = await roleGraph(DEMO_TARGET_ROLE, DEMO_DEMONSTRATED);
  const layers = phases(skills);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-muted-foreground text-sm">
          The subgraph {role.name} requires, minus what you have already shown,
          layered by prerequisite depth — {layers.length} phases.
        </p>
      </div>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_22rem]">
        <div className="h-[55vh] lg:h-auto">
          <SkillGraph skills={skills} mode="roadmap" />
        </div>

        <aside className="space-y-3 overflow-auto border-t p-4 lg:border-t-0 lg:border-l">
          {layers.map((layer, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Phase {i + 1}</CardTitle>
                  <Badge variant="secondary">{layer.length} skills</Badge>
                </div>
                <CardDescription>
                  {i === 0
                    ? "Nothing blocks these — every prerequisite is already met."
                    : `Unlocked once phase ${i} lands.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {layer.map((s) => (
                  <Badge key={s.id} variant="outline">
                    {s.name}
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
