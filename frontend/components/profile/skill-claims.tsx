"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api-client";
import {
  LEVEL_LABEL,
  SOURCE_HINT,
  SOURCE_LABEL,
  type StudentSkill,
} from "@/lib/profile-types";

type Option = { slug: string; name: string };

export function SkillClaims({
  skills,
  options,
}: {
  skills: StudentSkill[];
  options: Option[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState(3);

  const claimed = new Set(skills.map((skill) => skill.slug));
  const available = options.filter((option) => !claimed.has(option.slug));

  async function add() {
    if (!slug) return;
    setPending("add");
    setError(null);

    const result = await apiFetch("/api/profile/skills", {
      method: "PUT",
      body: { skills: [{ slug, level }] },
    });

    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSlug("");
    router.refresh();
  }

  async function remove(target: string) {
    setPending(target);
    setError(null);
    const result = await apiFetch(`/api/profile/skills/${target}`, {
      method: "DELETE",
    });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="skill-slug">Skill</Label>
          <select
            id="skill-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="">Choose a skill…</option>
            {available.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="skill-level">Level</Label>
          <select
            id="skill-level"
            value={level}
            onChange={(event) => setLevel(Number(event.target.value))}
            className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} — {LEVEL_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={add} disabled={!slug || pending === "add"}>
          {pending === "add" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {skills.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing claimed yet. Add what you already know, then take an assessment
          to turn a claim into evidence.
        </p>
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {skills.map((skill) => (
            <li
              key={skill.slug}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{skill.name}</p>
                <p className="text-muted-foreground text-xs">
                  Level {skill.level} — {LEVEL_LABEL[skill.level]}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={
                        skill.source === "self_reported" ? "outline" : "secondary"
                      }
                    >
                      {SOURCE_LABEL[skill.source]}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{SOURCE_HINT[skill.source]}</TooltipContent>
                </Tooltip>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${skill.name}`}
                  disabled={pending === skill.slug}
                  onClick={() => remove(skill.slug)}
                >
                  {pending === skill.slug ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
