import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { SkipLink } from "@/components/layout/skip-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Outside `(app)` deliberately. A privacy policy you have to create an account
 * to read is not a privacy policy — these have to be legible to someone
 * deciding whether to sign up at all.
 */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <header className="border-border/60 border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-heading font-semibold tracking-tight">
              SkillForge
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-6 py-10"
      >
        {children}
      </main>

      <footer className="border-border/60 text-muted-foreground border-t px-6 py-6 text-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> Back to SkillForge
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
