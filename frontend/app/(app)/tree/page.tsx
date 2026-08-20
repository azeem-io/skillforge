import { SkillTree } from "@/components/tree/skill-tree";
import { DEMO_DEMONSTRATED, DEMO_TARGET_ROLE } from "@/lib/demo-student";
import { tree } from "@/lib/skills";

// Reads live data per request; without this Next bakes the build-time rows in.
export const dynamic = "force-dynamic";

export default async function TreePage() {
  const { role, categories } = await tree(DEMO_TARGET_ROLE, DEMO_DEMONSTRATED);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Skill Tree</h1>
        <p className="text-muted-foreground text-sm">
          The whole taxonomy, you at the root. The Skill Graph shows what{" "}
          {role.name} needs; this shows where that sits in everything there is
          to learn.
        </p>
      </div>
      <SkillTree categories={categories} roleName={role.name} />
    </div>
  );
}
