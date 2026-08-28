import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
          <Sparkles className="size-4" />
        </div>
        <span className="font-heading text-lg font-semibold tracking-tight">
          SkillForge
        </span>
      </Link>

      <main className="bg-card w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
