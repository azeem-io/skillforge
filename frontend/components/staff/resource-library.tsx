"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import {
  RESOURCE_ICON,
  RESOURCE_LABEL,
  RESOURCE_TYPES,
  type Resource,
  type ResourceType,
} from "@/lib/resources";

export type SkillGroup = {
  label: string;
  skills: { slug: string; name: string }[];
};

type Viewer = { userId: string; role: "student" | "mentor" | "admin" };

const FIELD =
  "border-input bg-background focus-visible:ring-ring flex w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function ResourceLibrary({
  groups,
  resources,
  viewer,
}: {
  groups: SkillGroup[];
  resources: Resource[];
  viewer: Viewer;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [skillSlug, setSkillSlug] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("course");
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");

  const existing = useMemo(
    () => (skillSlug ? resources.filter((r) => r.skillSlug === skillSlug) : []),
    [resources, skillSlug],
  );
  const added = useMemo(() => resources.filter((r) => !r.seeded), [resources]);
  const seeded = resources.length - added.length;

  async function add() {
    if (!skillSlug || !title.trim()) return;
    setPending("add");
    setError(null);

    const result = await apiFetch<{ resource: Resource }>("/api/skills/resources", {
      method: "POST",
      body: {
        skillSlug,
        title: title.trim(),
        type,
        provider: provider.trim() || null,
        url: url.trim() || null,
        summary: summary.trim() || null,
      },
    });

    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    // The skill stays selected: a mentor adding one resource for a skill is
    // usually about to add another.
    setTitle("");
    setProvider("");
    setUrl("");
    setSummary("");
    router.refresh();
  }

  async function remove(id: string) {
    setPending(id);
    setError(null);
    const result = await apiFetch(`/api/skills/resources/${id}`, {
      method: "DELETE",
    });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function canRemove(resource: Resource): boolean {
    if (viewer.role === "admin") return true;
    return resource.author?.id === viewer.userId;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="resource-skill">Skill</Label>
            <select
              id="resource-skill"
              value={skillSlug}
              onChange={(event) => setSkillSlug(event.target.value)}
              className={`${FIELD} h-9`}
            >
              <option value="">Choose a skill…</option>
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.skills.map((skill) => (
                    <option key={skill.slug} value={skill.slug}>
                      {skill.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-type">Type</Label>
            <select
              id="resource-type"
              value={type}
              onChange={(event) => setType(event.target.value as ResourceType)}
              className={`${FIELD} h-9`}
            >
              {RESOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {RESOURCE_LABEL[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-title">Title</Label>
            <Input
              id="resource-title"
              value={title}
              placeholder="The Python Tutorial"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-provider">Provider</Label>
            <Input
              id="resource-provider"
              value={provider}
              placeholder="MDN, freeCodeCamp, …"
              onChange={(event) => setProvider(event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-url">Link</Label>
            <Input
              id="resource-url"
              type="url"
              value={url}
              placeholder="https://…"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="resource-summary">Summary</Label>
            <textarea
              id="resource-summary"
              value={summary}
              rows={2}
              placeholder={
                type === "project"
                  ? "What the student builds, and what it forces them to learn."
                  : "One line on what this covers. Optional."
              }
              onChange={(event) => setSummary(event.target.value)}
              className={`${FIELD} resize-y py-2`}
            />
            {type === "project" && (
              <p className="text-muted-foreground text-xs">
                A project is a brief, so the summary carries it — a link is
                optional. These feed the Projects stage of the roadmap.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={add} disabled={!skillSlug || !title.trim() || pending === "add"}>
            {pending === "add" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add resource
          </Button>
          <p className="text-muted-foreground text-xs">
            It appears on that skill in the Skill Tree straight away.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        {skillSlug && (
          <div className="bg-muted/40 rounded-md border p-3">
            <p className="text-muted-foreground text-xs">
              {existing.length === 0
                ? "Nothing listed for this skill yet — this would be the first."
                : `Already listed for this skill (${existing.length}):`}
            </p>
            {existing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existing.map((resource) => (
                  <Badge key={resource.id} variant="outline" className="font-normal">
                    {resource.title}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">Added by mentors</h2>
          <p className="text-muted-foreground text-xs">
            {seeded} more came with the seed taxonomy
          </p>
        </div>

        {added.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            None yet. Anything added here joins the seeded library on the same
            footing — students see one list per skill.
          </p>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {added.map((resource) => {
              const Icon = RESOURCE_ICON[resource.type];
              return (
                <li
                  key={resource.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />

                  <div className="min-w-56 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-sm font-medium hover:underline"
                        >
                          {resource.title}
                          <ExternalLink className="text-muted-foreground size-3" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium">{resource.title}</span>
                      )}
                      <Badge variant="secondary">{resource.skillName}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {[
                        RESOURCE_LABEL[resource.type],
                        resource.provider,
                        resource.author?.name ?? resource.author?.email,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {resource.summary && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {resource.summary}
                      </p>
                    )}
                  </div>

                  {canRemove(resource) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${resource.title}`}
                      disabled={pending === resource.id}
                      onClick={() => remove(resource.id)}
                    >
                      {pending === resource.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
