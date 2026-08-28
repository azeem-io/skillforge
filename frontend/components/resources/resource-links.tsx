import { ExternalLink, FileText } from "lucide-react";

import { RESOURCE_ICON, RESOURCE_LABEL, type ResourceType } from "@/lib/resources";
import { cn } from "@/lib/utils";

/**
 * The subset of a resource that is worth rendering. Deliberately looser than
 * `Resource` from lib/resources: the tree gets its resources embedded in the
 * `/tree` payload and carries no ids or authors, and both shapes fit here.
 */
export type ResourceLink = {
  title: string;
  url: string | null;
  type: string;
  provider: string | null;
};

function icon(type: string) {
  return RESOURCE_ICON[type as ResourceType] ?? FileText;
}

function label(type: string) {
  return RESOURCE_LABEL[type as ResourceType] ?? type;
}

/**
 * How a student is told what to actually do about a gap. Rendered wherever a
 * skill is named and the answer to "so how do I learn this?" is missing: the
 * graph's detail panel, the tree's, and each roadmap phase.
 */
export function ResourceLinks({
  resources,
  className,
}: {
  resources: ResourceLink[];
  className?: string;
}) {
  if (resources.length === 0) return null;

  return (
    <ul className={cn("space-y-1", className)}>
      {resources.map((resource) => {
        const Icon = icon(resource.type);
        const meta = [resource.provider, label(resource.type)]
          .filter(Boolean)
          .join(" · ");

        const body = (
          <>
            <Icon
              aria-hidden
              className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block leading-snug">{resource.title}</span>
              {meta && (
                <span className="text-muted-foreground text-[11px]">{meta}</span>
              )}
            </span>
            {resource.url && (
              <ExternalLink
                aria-hidden
                className="text-muted-foreground mt-0.5 size-3 shrink-0"
              />
            )}
          </>
        );

        return (
          <li key={`${resource.title}-${resource.url ?? ""}`} className="text-xs">
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-muted flex gap-2 rounded-md p-1.5 transition-colors"
              >
                {body}
              </a>
            ) : (
              // A mentor can add a resource with no link — a book, or a brief
              // they will hand over themselves. Still worth naming.
              <span className="flex gap-2 p-1.5">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
