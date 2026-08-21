"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";

import { RoleControls } from "@/components/staff/role-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { blockerFor } from "@/lib/staff";
import { cn } from "@/lib/utils";
import type { RosterStudent } from "@/lib/student";

export type RosterRow = RosterStudent & {
  /** Display names of whoever mentors this student. Admin view only. */
  mentors: string[];
};

type Filter = "all" | "attention" | "staff";
type Sort = "readiness" | "name" | "skills";

const SORTS: { key: Sort; label: string }[] = [
  { key: "readiness", label: "Readiness" },
  { key: "name", label: "Name" },
  { key: "skills", label: "Skills" },
];

function needsAttention(row: RosterRow, isAdmin: boolean) {
  // A mentor's roster is only their own students, so "has a mentor" is always
  // true there — the question only means anything when an admin is looking.
  return blockerFor(row, isAdmin ? row.mentors.length > 0 : true) !== null;
}

export function RosterTable({
  rows,
  isAdmin,
  selfId,
  mentorOptions,
  assignedByStudent,
}: {
  rows: RosterRow[];
  isAdmin: boolean;
  selfId: string;
  mentorOptions: { id: string; label: string }[];
  assignedByStudent: Record<string, string[]>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("readiness");

  const needle = query.trim().toLowerCase();
  const visible = rows
    .filter((row) => {
      if (filter === "attention" && !needsAttention(row, isAdmin)) return false;
      if (filter === "staff" && row.role === "student") return false;
      if (!needle) return true;
      return (
        (row.name ?? "").toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        (row.targetRoleName ?? "").toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      if (sort === "name")
        return (a.name ?? a.email).localeCompare(b.name ?? b.email);
      if (sort === "skills") return b.demonstrated - a.demonstrated;
      // Nulls last: someone with no goal has no readiness, and sorting them
      // as zero would bury the students who are genuinely just starting.
      if (a.readiness === null) return b.readiness === null ? 0 : 1;
      if (b.readiness === null) return -1;
      return b.readiness - a.readiness;
    });

  const attentionCount = rows.filter((row) =>
    needsAttention(row, isAdmin),
  ).length;

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "attention", label: "Needs attention", count: attentionCount },
    ...(isAdmin
      ? [
          {
            key: "staff" as const,
            label: "Mentors & admins",
            count: rows.filter((row) => row.role !== "student").length,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email or goal"
            aria-label="Search the roster"
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs">Sort</span>
          {SORTS.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={sort === key ? "secondary" : "ghost"}
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map(({ key, label, count }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "secondary" : "ghost"}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="gap-1.5"
          >
            {label}
            {count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  key === "attention" && count > 0
                    ? "text-mastery-gap-ring"
                    : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <Users className="size-4" />
            {needle
              ? `Nobody matches “${query.trim()}”.`
              : "Nothing in this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {visible.map((row) => (
            <Card key={row.userId}>
              <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                <div className="min-w-52 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {row.name ?? row.email}
                    </span>
                    {row.role !== "student" && (
                      <Badge variant="secondary" className="capitalize">
                        {row.role}
                      </Badge>
                    )}
                    {row.userId === selfId && (
                      <Badge variant="outline">You</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.email}
                  </p>
                  {row.mentors.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      Mentored by {row.mentors.join(", ")}
                    </p>
                  )}
                </div>

                {row.role === "student" && (
                  <div className="w-44 shrink-0">
                    <p className="text-muted-foreground truncate text-xs">
                      {row.targetRoleName ?? (
                        <span className="text-mastery-gap-ring">
                          No goal set
                        </span>
                      )}
                    </p>
                    {row.readiness !== null ? (
                      <>
                        <Progress
                          className="mt-1 h-1.5"
                          value={row.readiness}
                        />
                        <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
                          {row.readiness}% · {row.demonstrated} skills
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
                        {row.demonstrated} skills
                      </p>
                    )}
                  </div>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                  {isAdmin && (
                    <RoleControls
                      userId={row.userId}
                      role={row.role}
                      isSelf={row.userId === selfId}
                      mentors={mentorOptions.filter((m) => m.id !== row.userId)}
                      assigned={assignedByStudent[row.userId] ?? []}
                    />
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/students/${row.userId}`}>
                      Open <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
