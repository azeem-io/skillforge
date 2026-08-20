import { SkillGraph } from "@/components/graph/skill-graph";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { DEMO_DEMONSTRATED } from "@/lib/demo-student";
import { roleGraph } from "@/lib/skills";
import { resolveRole } from "@/lib/target-role";

// Reads live data per request; without this Next bakes the build-time rows in.
export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { slug, options } = await resolveRole((await searchParams).role);
  const { role, skills } = await roleGraph(slug, DEMO_DEMONSTRATED);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skill Graph</h1>
          <p className="text-muted-foreground text-sm">
            Every skill {role.name} requires, plus their prerequisites. Hover a
            node for the expand wand.
          </p>
        </div>
        <RoleSwitcher options={options} current={slug} />
      </div>
      <div className="flex-1">
        <SkillGraph skills={skills} mode="explore" />
      </div>
    </div>
  );
}
