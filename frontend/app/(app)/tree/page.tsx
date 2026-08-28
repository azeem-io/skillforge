import { SkillTree } from "@/components/tree/skill-tree";
import { GoalPicker } from "@/components/layout/goal-picker";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { roleTree, roleOptions, requireTargetRole } from "@/lib/student";

import type { Metadata } from "next";

// One student's mastery, resolved per request from their session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Skill tree · SkillForge" };

export default async function TreePage({
  searchParams,
}: PageProps<"/tree">) {
  const { roleSlug } = await requireTargetRole();
  const [options, { q }] = await Promise.all([roleOptions(), searchParams]);

  if (!roleSlug) return <GoalPicker options={options} />;

  const { role, categories } = await roleTree(roleSlug);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Skill Tree</h1>
          <p className="text-muted-foreground text-sm">
            The whole taxonomy, you at the root. The Skill Graph shows what{" "}
            {role.name} needs; this shows where that sits in everything there is
            to learn.
          </p>
        </div>
        <RoleSwitcher options={options} current={roleSlug} />
      </div>
      <SkillTree
        categories={categories}
        roleName={role.name}
        initialQuery={typeof q === "string" ? q : ""}
      />
    </div>
  );
}
