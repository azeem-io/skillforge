import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ApiError, apiOrNull } from "@/lib/api";

// The sidebar shows who is signed in, which is per-request state.
export const dynamic = "force-dynamic";

type Profile = { name: string; email: string; targetRoleName: string | null };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Null rather than a redirect: the graph and taxonomy views are readable
  // signed out, and they are the best advert the app has.
  //
  // A gateway that cannot be reached at all degrades the same way. Whoever is
  // signed in is chrome, not content — failing to resolve it should not take
  // down every page inside this layout, and the pages that genuinely need data
  // surface the error themselves.
  let me: { profile: Profile } | null = null;
  try {
    me = await apiOrNull<{ profile: Profile }>("/api/profile/me");
  } catch (error) {
    if (!(error instanceof ApiError && error.isUnreachable)) throw error;
    console.warn(`[app-layout] ${error.message}`);
  }

  return (
    <SidebarProvider>
      <AppSidebar user={me?.profile ?? null} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
