import { SkillGraph } from "@/components/graph/skill-graph";
import { DEMO_DEMONSTRATED, DEMO_TARGET_ROLE } from "@/lib/demo-student";
import { roleGraph } from "@/lib/skills";

// Reads live data per request; without this Next bakes the build-time rows in.
export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const { role, skills } = await roleGraph(DEMO_TARGET_ROLE, DEMO_DEMONSTRATED);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Skill Graph</h1>
        <p className="text-muted-foreground text-sm">
          Every skill {role.name} requires, plus their prerequisites. Hover a
          node for the expand wand.
        </p>
      </div>
      <div className="flex-1">
        <SkillGraph skills={skills} mode="explore" />
      </div>
    </div>
  );
}
