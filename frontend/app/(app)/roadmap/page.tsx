import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkillGraph } from "@/components/graph/skill-graph";
import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { phases } from "@/lib/skills";
import { roleGraph, roleOptions, requireTargetRole } from "@/lib/student";

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { roleSlug } = await requireTargetRole();
  const options = await roleOptions();

  if (!roleSlug) return <GoalPicker options={options} />;

  const { role, skills } = await roleGraph(roleSlug);
  const layers = phases(skills);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            The subgraph {role.name} requires, minus what you have already
            shown, layered by prerequisite depth — {layers.length} phases.
          </p>
        </div>
        <RoleSwitcher options={options} current={roleSlug} />
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
                    ? "Every prerequisite is far enough along to begin these now."
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
