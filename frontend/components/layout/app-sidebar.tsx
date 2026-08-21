"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  GitBranch,
  LayoutDashboard,
  LogIn,
  Route,
  Library,
  Sparkles,
  User,
  Users,
  Waypoints,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Role = "student" | "mentor" | "admin";
type Item = { href: string; label: string; icon: typeof LayoutDashboard };

const STUDENT_NAV: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/graph", label: "Skill Graph", icon: Waypoints },
  { href: "/roadmap", label: "Roadmap", icon: Route },
  { href: "/tree", label: "Skill Tree", icon: GitBranch },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/profile", label: "Profile", icon: User },
];

/**
 * Staff do not get the student pages. Every one of them — the dashboard's
 * readiness, the graph, the roadmap, the tree, the assessments — is measured
 * against a target role, and a mentor or admin has no target role. Showing them
 * to staff is six links to a goal picker.
 *
 * The Skill Tree is the exception worth naming: it renders the whole taxonomy,
 * so it is genuinely useful to staff as a catalogue. It is reached from a
 * student's page instead, where it has someone's mastery on it.
 */
const STAFF_NAV: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/resources", label: "Resources", icon: Library },
];

// Theirs, not a student's: the assistant answers career questions a mentor
// fields too, and everyone needs their own account page.
const STAFF_PERSONAL: Item[] = [
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
];

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: Item[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ href, label: text, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                tooltip={text}
                isActive={isActive(pathname, href)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{text}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * A prefix match, but only on a path boundary. Plain `startsWith` lights up
 * Resources while you are on Roadmap once a route like `/resource-packs` exists,
 * and it already cannot tell `/students` from `/students/:id` apart from its
 * parent — which here is wanted, so the boundary check keeps that and drops the
 * accidental matches.
 */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  user,
}: {
  user: {
    name: string | null;
    email: string;
    role?: Role;
    targetRoleName: string | null;
  } | null;
}) {
  const pathname = usePathname();
  const role = user?.role ?? "student";
  const isStaff = role === "mentor" || role === "admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
            <Sparkles className="size-4" />
          </div>
          <span className="font-heading text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            SkillForge
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isStaff ? (
          <>
            <NavGroup
              label={role === "admin" ? "Administration" : "Mentoring"}
              items={STAFF_NAV}
              pathname={pathname}
            />
            <NavGroup
              label="Personal"
              items={STAFF_PERSONAL}
              pathname={pathname}
            />
          </>
        ) : (
          <NavGroup
            label="Navigation"
            items={STUDENT_NAV}
            pathname={pathname}
          />
        )}
      </SidebarContent>

      <SidebarFooter>
        {user ? (
          <>
            <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {isStaff
                  ? role === "admin"
                    ? "Administrator"
                    : "Mentor"
                  : user.targetRoleName
                    ? `Goal: ${user.targetRoleName}`
                    : "No goal set yet"}
              </p>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SignOutButton />
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sign in">
                <Link href="/login">
                  <LogIn />
                  <span>Sign in</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
