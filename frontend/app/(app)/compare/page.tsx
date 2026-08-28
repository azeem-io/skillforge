import { AlertTriangle } from "lucide-react";

import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleComparison, type RoleScore } from "@/components/roadmap/role-comparison";
import { EmptyState } from "@/components/layout/empty-state";
import { api } from "@/lib/api";
import { requireTargetRole, roleOptions } from "@/lib/student";

import type { Metadata } from "next";

// Measured against one student's demonstrated levels, per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Compare roles · SkillForge" };

/** The gateway's `/api/skills/analyzer-context` returns exactly the body
 *  python-analyzer's `/compare` accepts, so this page is a pass-through. */
type Context = Record<string, unknown>;

export default async function ComparePage() {
  const { roleSlug } = await requireTargetRole();
  const options = await roleOptions();

  // Comparing needs a baseline to compare against — without a goal every
  // column would be equally hypothetical.
  if (!roleSlug) return <GoalPicker options={options} />;

  const context = await api<Context>(
    `/api/skills/analyzer-context?role=${encodeURIComponent(roleSlug)}`,
  );

  // The analyzer is the only thing that can answer this: readiness is its
  // formula, and the roadmap phases it counts weeks over are its layering.
  // There is no local fallback here on purpose — a comparison computed a
  // second way would disagree with the dashboard it sits next to.
  const comparison = await api<{ roles: RoleScore[] }>("/api/analysis/compare", {
    method: "POST",
    body: context,
  }).catch(() => null);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare roles</h1>
        <p className="text-muted-foreground text-sm">
          Every seeded role scored against what you have actually demonstrated,
          best fit first. The same formula the dashboard uses for your goal.
        </p>
      </div>

      {comparison ? (
        <RoleComparison
          roles={comparison.roles}
          current={roleSlug}
          summaries={Object.fromEntries(
            options.map((option) => [option.slug, option.summary]),
          )}
        />
      ) : (
        <EmptyState icon={AlertTriangle} title="The analyzer is unreachable">
          Readiness across roles is computed by python-analyzer, and it is not
          answering. Your own goal and roadmap are unaffected.
        </EmptyState>
      )}
    </div>
  );
}
