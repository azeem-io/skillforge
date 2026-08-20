"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { SidebarMenuButton } from "@/components/ui/sidebar";
import { apiFetch } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <SidebarMenuButton
      tooltip="Sign out"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await apiFetch("/api/auth/sign-out", { method: "POST", body: {} });
        // replace, not push: the signed-in dashboard should not be one Back
        // press away after signing out.
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut />
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </SidebarMenuButton>
  );
}
