"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { assignMentor, changeUserRole, unassignMentor } from "@/lib/actions";

type Role = "student" | "mentor" | "admin";
const ROLES: Role[] = ["student", "mentor", "admin"];

export function RoleControls({
  userId,
  role,
  isSelf,
  mentors,
  assigned,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
  mentors: { id: string; label: string }[];
  assigned: string[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<void>) {
    start(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending} className="gap-1.5">
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            <span className="capitalize">{role}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Change role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((option) => (
            <DropdownMenuItem
              key={option}
              // An admin demoting themselves would leave nobody able to promote
              // them back; the service rejects it too.
              disabled={option === role || (isSelf && option !== "admin")}
              onSelect={() => run(() => changeUserRole(userId, option))}
              className="capitalize"
            >
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {mentors.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}>
              <UserPlus className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mentors</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mentors.map((mentor) => {
              const has = assigned.includes(mentor.id);
              return (
                <DropdownMenuItem
                  key={mentor.id}
                  onSelect={() =>
                    run(() =>
                      has
                        ? unassignMentor(userId, mentor.id)
                        : assignMentor(userId, mentor.id),
                    )
                  }
                >
                  {has ? "Remove " : "Assign "}
                  {mentor.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
