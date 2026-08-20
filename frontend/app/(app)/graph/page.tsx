import { SkillGraph } from "@/components/graph/skill-graph";

export default function GraphPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Skill Graph</h1>
        <p className="text-muted-foreground text-sm">
          Every skill and its prerequisites. Hover a node for the expand wand.
        </p>
      </div>
      <div className="flex-1">
        <SkillGraph mode="explore" />
      </div>
    </div>
  );
}
