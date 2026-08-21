import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { GenerateButton } from "@/components/roadmap/generate-button";
import { RoadmapView } from "@/components/roadmap/roadmap-view";

import type { Metadata } from "next";
import {
  roleGraph,
  roleOptions,
  requireTargetRole,
  savedRoadmap,
} from "@/lib/student";

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Roadmap · SkillForge" };

export default async function RoadmapPage() {
  const { roleSlug } = await requireTargetRole();
  const options = await roleOptions();

  if (!roleSlug) return <GoalPicker options={options} />;

  const [{ role, skills }, { roadmap }] = await Promise.all([
    roleGraph(roleSlug),
    savedRoadmap(),
  ]);

  // A roadmap generated against a different goal is stale, not this goal's.
  const current = roadmap?.roleSlug === roleSlug ? roadmap : null;
  const totalWeeks = current?.phases.reduce(
    (sum, phase) => sum + (phase.estimatedWeeks ?? 0),
    0,
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            {current
              ? `${current.phases.length} phases, about ${totalWeeks} weeks at 8 hours a week.`
              : `What ${role.name} requires, minus what you have shown. Generate a plan to save it.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleSwitcher options={options} current={roleSlug} />
          <GenerateButton existing={Boolean(current)} />
        </div>
      </div>

      <RoadmapView skills={skills} roadmap={current} />
    </div>
  );
}
