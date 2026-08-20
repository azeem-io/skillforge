import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { apiOrNull } from "@/lib/api";

// The sidebar shows who is signed in, which is per-request state.
export const dynamic = "force-dynamic";

type Profile = { name: string; email: string; targetRoleName: string | null };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Null rather than a redirect: the graph and taxonomy views are readable
  // signed out, and they are the best advert the app has.
  const me = await apiOrNull<{ profile: Profile }>("/api/profile/me");

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
