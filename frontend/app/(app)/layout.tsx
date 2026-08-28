import type { Metadata } from "next";

import { AssistantSheet } from "@/components/ai/assistant-sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { SkipLink } from "@/components/layout/skip-link";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireUser } from "@/lib/student";

// The sidebar shows who is signed in, which is per-request state.
export const dynamic = "force-dynamic";

// Inherited by every page in here. A crawler only ever gets the login
// redirect, but there is no reason for these paths to be in an index at all.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Every page in here reads one student's skills, goal and progress. There is
  // no longer an anonymous view to fall back to: an unauthenticated graph would
  // show a role nobody chose, with nobody's mastery on it.
  const user = await requireUser();

  return (
    <SidebarProvider>
      <SkipLink />
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <CommandPalette />
          <div className="ml-auto">
            <AssistantSheet userId={user.userId} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
