import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="text-muted-foreground size-8" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          That page isn&apos;t here
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The link may be out of date, or the skill or assessment it pointed at
          may have been renamed.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to the dashboard</Link>
      </Button>
    </main>
  );
}
