"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import type { ExperienceLevel, Profile, Role } from "@/lib/profile-types";

const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function ProfileForm({
  profile,
  roles,
}: {
  profile: Profile;
  roles: Role[];
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("saving");

    const form = new FormData(event.currentTarget);
    const targetRoleSlug = String(form.get("targetRoleSlug") ?? "");

    const result = await apiFetch("/api/profile/me", {
      method: "PUT",
      body: {
        name: String(form.get("name") ?? ""),
        headline: String(form.get("headline") ?? "") || null,
        education: String(form.get("education") ?? "") || null,
        bio: String(form.get("bio") ?? "") || null,
        experienceLevel: String(form.get("experienceLevel") ?? "beginner"),
        // An empty select means "no goal yet", which is a null column rather
        // than an unsent field — the student may be clearing it deliberately.
        targetRoleSlug: targetRoleSlug || null,
      },
    });

    if (!result.ok) {
      setError(result.error);
      setState("idle");
      return;
    }

    setState("saved");
    // The target role drives the dashboard, graph and roadmap, so every server
    // component reading it has to re-render.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={profile.name} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            name="headline"
            defaultValue={profile.headline ?? ""}
            placeholder="Final-year CS student"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="education">Education</Label>
        <Input
          id="education"
          name="education"
          defaultValue={profile.education ?? ""}
          placeholder="BSc Computer Science, University of ..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="experienceLevel">Experience</Label>
          <select
            id="experienceLevel"
            name="experienceLevel"
            defaultValue={profile.experienceLevel}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetRoleSlug">Target role</Label>
          <select
            id="targetRoleSlug"
            name="targetRoleSlug"
            defaultValue={profile.targetRoleSlug ?? ""}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="">Not decided yet</option>
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">About</Label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={profile.bio ?? ""}
          placeholder="What you are working on, and where you want to end up."
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === "saving"}>
          {state === "saving" && <Loader2 className="size-4 animate-spin" />}
          Save profile
        </Button>
        {state === "saved" && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Check className="text-success size-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
