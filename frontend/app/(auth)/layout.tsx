import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
          <Sparkles className="size-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">SkillForge</span>
      </Link>

      <main className="bg-card w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
