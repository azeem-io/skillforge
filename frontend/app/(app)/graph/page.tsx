import { SkillGraph } from "@/components/graph/skill-graph";
import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import {
  requireTargetRole,
  resourcesBySkill,
  roleGraph,
  roleOptions,
} from "@/lib/student";

import type { Metadata } from "next";

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Skill graph" };

export default async function GraphPage({
  searchParams,
}: PageProps<"/graph">) {
  const { roleSlug } = await requireTargetRole();
  const options = await roleOptions();

  if (!roleSlug) return <GoalPicker options={options} />;

  const [{ role, skills }, resources, { skill }] = await Promise.all([
    roleGraph(roleSlug),
    resourcesBySkill(),
    searchParams,
  ]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Skill Graph</h1>
          <p className="text-muted-foreground text-sm">
            Every skill {role.name} requires, plus their prerequisites. Select
            a node for its detail, what to read next, and the expand wand.
          </p>
        </div>
        <RoleSwitcher options={options} current={roleSlug} />
      </div>
      <div className="flex-1">
        <SkillGraph
          skills={skills}
          mode="explore"
          resources={resources}
          focusSlug={typeof skill === "string" ? skill : null}
        />
      </div>
    </div>
  );
}
