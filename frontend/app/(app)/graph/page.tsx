import { SkillGraph } from "@/components/graph/skill-graph";
import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { roleGraph, roleOptions, requireTargetRole } from "@/lib/student";

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const { roleSlug } = await requireTargetRole();
  const options = await roleOptions();

  if (!roleSlug) return <GoalPicker options={options} />;

  const { role, skills } = await roleGraph(roleSlug);

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
        <RoleSwitcher options={options} current={roleSlug} />
      </div>
      <div className="flex-1">
        <SkillGraph skills={skills} mode="explore" />
      </div>
    </div>
  );
}
