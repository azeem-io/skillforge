"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  CalendarClock,
  ClipboardCheck,
  CornerDownLeft,
  GitBranch,
  LayoutDashboard,
  Library,
  Loader2,
  Route,
  Scale,
  Search,
  Sparkles,
  Target,
  User,
  Users,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { SearchButton } from "@/components/layout/search-button";
import { setTargetRole } from "@/lib/actions";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  group: "Pages" | "Assessments" | "Roles" | "Skills";
  /** Roles are not a page. Choosing one sets the goal every view measures
   *  against, then lands on the roadmap it just changed. */
  setGoal?: string;
};

/** Always present, no fetch required — the palette is useful before the
 *  taxonomy has loaded, and on a connection that never loads it at all. */
const PAGES: Entry[] = [
  { id: "p-dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
  { id: "p-assistant", label: "Assistant", href: "/assistant", icon: Sparkles, group: "Pages" },
  { id: "p-graph", label: "Skill Graph", href: "/graph", icon: Waypoints, group: "Pages" },
  { id: "p-roadmap", label: "Roadmap", href: "/roadmap", icon: Route, group: "Pages" },
  { id: "p-tree", label: "Skill Tree", href: "/tree", icon: GitBranch, group: "Pages" },
  { id: "p-compare", label: "Compare Roles", href: "/compare", icon: Scale, group: "Pages" },
  { id: "p-assessments", label: "Assessments", href: "/assessments", icon: ClipboardCheck, group: "Pages" },
  { id: "p-review", label: "Review", href: "/review", icon: CalendarClock, group: "Pages" },
  { id: "p-profile", label: "Profile", href: "/profile", icon: User, group: "Pages" },
  { id: "p-students", label: "Students", href: "/students", icon: Users, group: "Pages" },
  { id: "p-resources", label: "Resources", href: "/resources", icon: Library, group: "Pages" },
];

const GROUP_ORDER: Entry["group"][] = ["Pages", "Assessments", "Roles", "Skills"];

/** A skill has no page of its own. The tree is where one is inspected, and it
 *  seeds its search from `?q=`, which lights the node and its ancestors. */
const SKILL_HREF = (name: string) => `/tree?q=${encodeURIComponent(name)}`;

type Taxonomy = {
  categories: {
    name: string;
    subcategories: { name: string; skills: { slug: string; name: string }[] }[];
  }[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [catalog, setCatalog] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Fetched once, on first open. Three requests nobody pays for until they
  // reach for the palette, and never again for the life of the page.
  const load = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    const [taxonomy, assessments, roles] = await Promise.all([
      apiFetch<Taxonomy>("/api/skills/taxonomy"),
      apiFetch<{ assessments: { slug: string; title: string; skillName: string }[] }>(
        "/api/skills/assessments",
      ),
      apiFetch<{ roles: { slug: string; name: string }[] }>("/api/skills/roles"),
    ]);

    const entries: Entry[] = [];

    if (assessments.ok) {
      for (const item of assessments.data.assessments) {
        entries.push({
          id: `a-${item.slug}`,
          label: item.title,
          hint: item.skillName,
          href: `/assessments/${item.slug}`,
          icon: ClipboardCheck,
          group: "Assessments",
        });
      }
    }

    if (roles.ok) {
      for (const role of roles.data.roles) {
        entries.push({
          id: `r-${role.slug}`,
          label: role.name,
          href: "/roadmap",
          setGoal: role.slug,
          icon: Target,
          group: "Roles",
          hint: "Set as goal",
        });
      }
    }

    if (taxonomy.ok) {
      for (const category of taxonomy.data.categories) {
        for (const sub of category.subcategories) {
          for (const skill of sub.skills) {
            entries.push({
              id: `s-${skill.slug}`,
              label: skill.name,
              hint: sub.name,
              href: SKILL_HREF(skill.name),
              icon: GitBranch,
              group: "Skills",
            });
          }
        }
      }
    }

    setCatalog(entries);
    setLoading(false);
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    void load();
  }, [load]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // ⌘K / Ctrl-K anywhere, and "/" when the caret is not already in a field —
  // the assessment answer box and every search input have to keep the key.
  // Re-bound whenever `open` changes, which is what lets ⌘K toggle.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
        return;
      }
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette, closePalette]);

  const results = useMemo(() => {
    const all = [...PAGES, ...(catalog ?? [])];
    const needle = query.trim().toLowerCase();
    if (!needle) return all.slice(0, 12);

    // Prefix matches first: typing "py" should reach Python before it reaches
    // anything that merely contains those two letters.
    const scored = all
      .map((entry) => {
        const label = entry.label.toLowerCase();
        const hint = entry.hint?.toLowerCase() ?? "";
        if (label.startsWith(needle)) return { entry, rank: 0 };
        if (label.includes(needle)) return { entry, rank: 1 };
        if (hint.includes(needle)) return { entry, rank: 2 };
        return null;
      })
      .filter((row): row is { entry: Entry; rank: number } => row !== null)
      .sort((a, b) => a.rank - b.rank);

    return scored.slice(0, 20).map((row) => row.entry);
  }, [catalog, query]);

  // A stale index survives filtering and would run the wrong entry on Enter.
  const clamped = Math.min(active, Math.max(0, results.length - 1));

  const go = useCallback(
    (entry: Entry | undefined) => {
      if (!entry) return;
      closePalette();

      if (!entry.setGoal) {
        router.push(entry.href);
        return;
      }
      // The goal has to be persisted before the roadmap renders, or the page
      // that opens is still measured against the previous role.
      start(async () => {
        await setTargetRole(entry.setGoal!);
        router.push(entry.href);
        router.refresh();
      });
    },
    [router, closePalette],
  );

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[clamped]);
    }
  }

  // Keeps the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  });

  return (
    <>
      <SearchButton onOpen={openPalette} />
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? openPalette() : closePalette())}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-xs" />
          <Dialog.Content
            className="bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 fixed top-[12vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border shadow-lg"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Search SkillForge</Dialog.Title>

            <div className="flex items-center gap-2 border-b px-3">
              {loading ? (
                <Loader2 aria-hidden className="text-muted-foreground size-4 animate-spin" />
              ) : (
                <Search aria-hidden className="text-muted-foreground size-4" />
              )}
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search skills, assessments, roles and pages…"
                aria-label="Search SkillForge"
                className="placeholder:text-muted-foreground h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto p-1">
              {results.length === 0 ? (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                  Nothing matches &ldquo;{query.trim()}&rdquo;.
                </p>
              ) : (
                GROUP_ORDER.map((group) => {
                  const rows = results.filter((entry) => entry.group === group);
                  if (rows.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
                        {group}
                      </p>
                      {rows.map((entry) => {
                        const index = results.indexOf(entry);
                        const isActive = index === clamped;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            data-active={isActive}
                            onMouseMove={() => setActive(index)}
                            onClick={() => go(entry)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                              isActive && "bg-accent text-accent-foreground",
                            )}
                          >
                            <entry.icon className="text-muted-foreground size-4 shrink-0" />
                            <span className="truncate">{entry.label}</span>
                            {entry.hint && (
                              <span className="text-muted-foreground ml-auto shrink-0 truncate text-xs">
                                {entry.hint}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-muted-foreground flex items-center gap-3 border-t px-3 py-2 text-xs">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
              <span className="flex items-center gap-1">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>{" "}
                open
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Kbd>esc</Kbd> close
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}
