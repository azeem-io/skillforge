"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyTheme,
  readTheme,
  subscribeTheme,
  writeTheme,
  type Theme,
} from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const SERVER_SNAPSHOT = (): Theme => "system";

/**
 * Three states rather than two: "system" is the default and has to stay
 * reachable, or someone who follows their OS at dusk can never get back to it
 * once they have tried the other two.
 *
 * The colours themselves are already on screen by the time this mounts — the
 * inline script in `<head>` painted them. This only reflects and changes them.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    // The server cannot read this browser's localStorage, so it renders the
    // default and the first client snapshot corrects the icon.
    SERVER_SNAPSHOT,
  );

  // While on "system", the OS flipping at sunset has to move the page with it.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const Active = OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          aria-label={`Theme: ${theme}`}
        >
          <Active className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => writeTheme(value)}>
            <Icon className="size-4" />
            {label}
            {theme === value && (
              <span aria-hidden className="text-muted-foreground ml-auto text-xs">
                ✓
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
