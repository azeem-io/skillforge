"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Every page inside (app) reads live data through the gateway, so the failure
 *  a student actually hits is a service being down, not a render bug. The
 *  message says which, because "something went wrong" is not actionable. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[skillforge]", error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="text-destructive size-8" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">
          Something broke on our side
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          This is usually a backend service that is not running. Check the
          gateway on :8080, then try again.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
