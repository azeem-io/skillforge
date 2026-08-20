"use client";

import {
  BookOpen,
  ExternalLink,
  FileCode2,
  FileText,
  GraduationCap,
  Hammer,
  Lock,
  Video,
} from "lucide-react";

import { CATEGORY_TEXT } from "@/lib/category";
import {
  MASTERY_CHIP,
  MASTERY_DESCRIPTION,
  MASTERY_DOT,
  MASTERY_LABEL,
  type Mastery,
} from "@/lib/mastery";
import { cn } from "@/lib/utils";
import type { TreeDatum } from "./types";

const ORDER: Mastery[] = ["mastered", "progress", "gap", "locked"];

const RESOURCE_ICON: Record<string, typeof BookOpen> = {
  course: GraduationCap,
  article: FileText,
  video: Video,
  book: BookOpen,
  project: Hammer,
  documentation: FileCode2,
};

function LevelDots({ level, required }: { level: number; required: number }) {
  const total = Math.max(required, level, 1);
  return (
    <span
      className="flex items-center gap-1"
      aria-label={`Level ${level} of ${required || total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < level ? "bg-current opacity-90" : "bg-current opacity-25",
          )}
        />
      ))}
    </span>
  );
}

function MasteryBar({ leaves }: { leaves: TreeDatum[] }) {
  const total = leaves.length;
  if (!total) return null;
  const slices = ORDER.map((m) => ({
    m,
    n: leaves.filter((l) => l.mastery === m).length,
  })).filter((s) => s.n);
  const off = leaves.filter((l) => l.mastery === null).length;

  return (
    <div>
      <div className="bg-muted flex h-2 overflow-hidden rounded-full">
        {slices.map(({ m, n }) => (
          <span
            key={m}
            className={MASTERY_DOT[m]}
            style={{ width: `${(n / total) * 100}%` }}
            title={`${MASTERY_LABEL[m]}: ${n}`}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {slices.map(({ m, n }) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${MASTERY_DOT[m]}`} />
            {MASTERY_LABEL[m]} {n}
          </span>
        ))}
        {off > 0 && <span>{off} outside your goal</span>}
      </div>
    </div>
  );
}

function Chips({
  ids,
  lookup,
  onGoto,
  withLevel = false,
}: {
  ids: string[];
  lookup: (id: string) => TreeDatum | undefined;
  onGoto: (id: string) => void;
  withLevel?: boolean;
}) {
  const found = ids.map(lookup).filter((d): d is TreeDatum => Boolean(d));
  if (!found.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {found.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onGoto(d.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
            d.mastery
              ? MASTERY_CHIP[d.mastery]
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {d.mastery === "locked" && <Lock className="size-3 shrink-0" />}
          <span>{d.name}</span>
          {withLevel && d.requiredLevel > 0 && (
            <span className="tabular-nums opacity-70">
              {d.level}/{d.requiredLevel}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t pt-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function TreeDetail({
  node,
  path,
  leaves,
  categoryIndex,
  roleName,
  lookup,
  onGoto,
}: {
  node: TreeDatum;
  path: string[];
  leaves: TreeDatum[];
  categoryIndex: number;
  roleName: string;
  lookup: (id: string) => TreeDatum | undefined;
  onGoto: (id: string) => void;
}) {
  const onPath = leaves.filter((l) => l.mastery !== null).length;
  const isSkill = node.altitude === "SKILL";

  return (
    <div className="space-y-4">
      <header>
        {path.length > 0 && (
          <div className="text-muted-foreground text-xs">
            {path.join(" › ")}
          </div>
        )}
        <h2
          className={cn(
            "mt-0.5 text-lg leading-tight font-semibold",
            node.altitude === "CATEGORY" && CATEGORY_TEXT[categoryIndex],
          )}
        >
          {node.name}
        </h2>
        {node.description && (
          <p className="text-muted-foreground mt-1.5 text-sm">
            {node.description}
          </p>
        )}
      </header>

      {isSkill ? (
        node.mastery ? (
          <div className="space-y-2.5">
            <div
              className={cn("rounded-md px-3 py-2", MASTERY_CHIP[node.mastery])}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {node.mastery === "locked" && <Lock className="size-3.5" />}
                {MASTERY_LABEL[node.mastery]}
              </div>
              <p className="mt-0.5 text-xs opacity-75">
                {MASTERY_DESCRIPTION[node.mastery]}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Level {node.level} of {node.requiredLevel} required
              </span>
              <LevelDots level={node.level} required={node.requiredLevel} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Weight for {roleName}
              </span>
              <span className="tabular-nums">{node.weight} of 5</span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            <p>{roleName} does not require this skill.</p>
            {node.level > 0 && (
              <p className="text-foreground mt-1">
                You have shown level {node.level} anyway.
              </p>
            )}
          </div>
        )
      ) : (
        <Section title={`${leaves.length} skills`}>
          <p className="text-muted-foreground text-xs">
            {onPath} on the path to {roleName}.
          </p>
          <MasteryBar leaves={leaves} />
        </Section>
      )}

      {node.altitude === "ROOT" && (
        <Section title="Reading this">
          <dl className="text-muted-foreground space-y-1.5 text-xs">
            <div>
              <dt className="text-foreground inline font-medium">Colour</dt>{" "}
              <dd className="inline">
                is where you stand on a skill — green once you are at the level{" "}
                {roleName} asks for, blue while you are getting there, red for a
                gap you can start now, grey and locked when something else has
                to come first.
              </dd>
            </div>
            <div>
              <dt className="text-foreground inline font-medium">Size</dt>{" "}
              <dd className="inline">
                is how much {roleName} needs it: the level required, times how
                heavily the role weights it.
              </dd>
            </div>
            <div>
              <dt className="text-foreground inline font-medium">Faded</dt>{" "}
              <dd className="inline">
                skills sit outside this goal — still real skills, just not on
                this path.
              </dd>
            </div>
          </dl>
        </Section>
      )}

      {isSkill && node.prerequisites?.length ? (
        <Section title="Learn first">
          <Chips
            ids={node.prerequisites}
            lookup={lookup}
            onGoto={onGoto}
            withLevel
          />
          {node.mastery === "locked" && (
            <p className="text-muted-foreground text-xs">
              Get these at least halfway to the level they need and this opens
              up.
            </p>
          )}
        </Section>
      ) : null}

      {isSkill && node.unlocks?.length ? (
        <Section title="Unlocks">
          <Chips ids={node.unlocks} lookup={lookup} onGoto={onGoto} />
        </Section>
      ) : null}

      {isSkill && node.resources?.length ? (
        <Section title="Resources">
          <ul className="space-y-1.5">
            {node.resources.map((r) => {
              const Icon = RESOURCE_ICON[r.type] ?? FileText;
              const body = (
                <>
                  <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{r.title}</span>
                    {r.provider && (
                      <span className="text-muted-foreground text-[11px]">
                        {r.provider}
                      </span>
                    )}
                  </span>
                  {r.url && (
                    <ExternalLink className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                  )}
                </>
              );
              return (
                <li key={r.title} className="text-xs">
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:bg-muted flex gap-2 rounded-md p-1.5 transition-colors"
                    >
                      {body}
                    </a>
                  ) : (
                    <span className="flex gap-2 p-1.5">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {!isSkill && node.children?.length ? (
        <Section title={node.altitude === "ROOT" ? "Categories" : "Inside"}>
          <Chips
            ids={node.children.map((c) => c.id)}
            lookup={lookup}
            onGoto={onGoto}
          />
        </Section>
      ) : null}
    </div>
  );
}
