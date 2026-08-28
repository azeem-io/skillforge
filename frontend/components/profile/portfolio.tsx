"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BadgeCheck, ExternalLink, FolderGit2, Loader2, Plus, X } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import type { Certification, Project } from "@/lib/profile-types";

function useRowActions(path: string) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setPending(id);
    setError(null);
    const result = await apiFetch(`${path}/${id}`, { method: "DELETE" });
    setPending(null);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  async function create(body: unknown) {
    setPending("create");
    setError(null);
    const result = await apiFetch(path, { method: "POST", body });
    setPending(null);
    if (!result.ok) return setError(result.error);
    router.refresh();
    return true;
  }

  return { pending, error, remove, create };
}

export function Projects({ projects }: { projects: Project[] }) {
  const { pending, error, remove, create } = useRowActions("/api/profile/projects");
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await create({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? "") || null,
      url: String(form.get("url") ?? "") || null,
    });
    if (created) {
      event.currentTarget.reset();
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      {projects.length === 0 && !open && (
        <EmptyState compact icon={FolderGit2} title="No projects yet">
          A project is the strongest evidence you can show for a skill.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{project.title}</p>
              {project.description && (
                <p className="text-muted-foreground text-sm">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {project.skills.map((skill) => (
                  <Badge key={skill.slug} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    <ExternalLink className="size-3" /> Open
                  </a>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${project.title}`}
              disabled={pending === project.id}
              onClick={() => remove(project.id)}
            >
              {pending === project.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {open ? (
        <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-3">
          <div className="space-y-2">
            <Label htmlFor="project-title">Title</Label>
            <Input id="project-title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input id="project-description" name="description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-url">Link</Label>
            <Input
              id="project-url"
              name="url"
              type="url"
              placeholder="https://github.com/..."
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending === "create"}>
              {pending === "create" && <Loader2 className="size-4 animate-spin" />}
              Add project
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add project
        </Button>
      )}
    </div>
  );
}

export function Certifications({
  certifications,
}: {
  certifications: Certification[];
}) {
  const { pending, error, remove, create } = useRowActions(
    "/api/profile/certifications",
  );
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const issued = String(form.get("issuedAt") ?? "");
    const created = await create({
      name: String(form.get("name") ?? ""),
      issuer: String(form.get("issuer") ?? "") || null,
      // The date input gives YYYY-MM-DD; the column is timestamptz, so it needs
      // widening to a full instant before the service will accept it.
      issuedAt: issued ? new Date(`${issued}T00:00:00Z`).toISOString() : null,
      credentialUrl: String(form.get("credentialUrl") ?? "") || null,
    });
    if (created) {
      event.currentTarget.reset();
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      {certifications.length === 0 && !open && (
        <EmptyState compact icon={BadgeCheck} title="No certifications yet">
          Anything issued by a provider — a cloud badge, a course certificate.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {certifications.map((certification) => (
          <li
            key={certification.id}
            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{certification.name}</p>
              <p className="text-muted-foreground text-xs">
                {certification.issuer ?? "Unknown issuer"}
                {certification.issuedAt &&
                  ` · ${new Date(certification.issuedAt).getFullYear()}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${certification.name}`}
              disabled={pending === certification.id}
              onClick={() => remove(certification.id)}
            >
              {pending === certification.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {open ? (
        <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-3">
          <div className="space-y-2">
            <Label htmlFor="cert-name">Name</Label>
            <Input id="cert-name" name="name" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cert-issuer">Issuer</Label>
              <Input id="cert-issuer" name="issuer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-issued">Issued</Label>
              <Input id="cert-issued" name="issuedAt" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cert-url">Credential link</Label>
            <Input id="cert-url" name="credentialUrl" type="url" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending === "create"}>
              {pending === "create" && <Loader2 className="size-4 animate-spin" />}
              Add certification
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add certification
        </Button>
      )}
    </div>
  );
}
