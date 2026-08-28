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

      <p className="text-muted-foreground text-xs">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="hover:text-foreground underline underline-offset-2">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-foreground underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
