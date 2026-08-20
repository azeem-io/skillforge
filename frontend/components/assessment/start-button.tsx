"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

/**
 * Starting an attempt is a write, so it happens on click rather than on
 * navigation — a link would create an attempt row every time someone hovered
 * the prefetcher over it.
 */
export function StartButton({
  slug,
  label,
  variant = "default",
}: {
  slug: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Button
        variant={variant}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await apiFetch<{ attempt: { id: string } }>(
            `/api/skills/assessments/${slug}/attempts`,
            { method: "POST", body: {} },
          );
          if (!result.ok) {
            setError(result.error);
            setPending(false);
            return;
          }
          router.push(`/assessments/${slug}?attempt=${result.data.attempt.id}`);
        }}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
