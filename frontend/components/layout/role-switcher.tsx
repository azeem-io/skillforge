"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Target } from "lucide-react";

import { setTargetRole } from "@/lib/actions";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Role = {
  slug: string;
  name: string;
  summary: string | null;
};

export function RoleSwitcher({
  options,
  current,
}: {
  options: Role[];
  current: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = options.find((r) => r.slug === current);

  function choose(slug: string) {
    if (slug === current) return;
    start(async () => {
      await setTargetRole(slug);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Target className="text-muted-foreground size-3.5" />
          )}
          <span className="font-medium">{active?.name ?? "Choose a goal"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Target role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((role) => (
          <DropdownMenuItem
            key={role.slug}
            onSelect={() => choose(role.slug)}
            className="flex-col items-start gap-1"
          >
            <span className="flex items-center gap-2">
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  role.slug === current ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="font-medium">{role.name}</span>
            </span>
            {role.summary && (
              <span className="text-muted-foreground pl-6 text-xs leading-snug">
                {role.summary}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
