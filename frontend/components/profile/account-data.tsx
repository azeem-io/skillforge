"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

/**
 * Export and deletion, the two things a person is entitled to do with their own
 * record. Deliberately at the bottom of the profile and visually quiet — this
 * has to be findable without being a button anyone lands on by accident.
 */
export function AccountData({ email }: { email: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  async function remove() {
    setPending(true);
    setError(null);

    const result = await apiFetch<{ ok: true }>("/api/profile/account", {
      method: "DELETE",
      body: { email: confirm.trim() },
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // The session row went with the account, so every subsequent request is
    // already anonymous. Landing on the marketing page rather than /login
    // avoids bouncing off a redirect on the way out.
    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your data</CardTitle>
        <CardDescription>
          What we hold and why is on the <Link href="/privacy" className="underline underline-offset-2">privacy page</Link>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Download everything</p>
          <p className="text-muted-foreground text-sm">
            One JSON file: your profile, skills, portfolio, every assessment
            answer you have given, your review schedule and history, and your
            roadmaps.
          </p>
          {/* A plain link, not fetch-and-blob: the route already answers with
              Content-Disposition, so the browser saves it without JavaScript
              holding the whole export in memory first. */}
          <Button variant="outline" size="sm" asChild>
            <a href="/api/profile/account/export" download>
              <Download className="size-3.5" />
              Export my data
            </a>
          </Button>
        </div>

        <div className="border-destructive/30 space-y-3 rounded-lg border border-dashed p-4">
          <div className="flex items-start gap-2">
            <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Delete this account</p>
              <p className="text-muted-foreground text-sm">
                Immediate and permanent. Your profile, skills, portfolio,
                uploaded files, every attempt and answer, your review schedule
                and your roadmaps all go. There is no backup we can restore.
              </p>
            </div>
          </div>

          {!open ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="confirm-email">
                  Type <span className="font-mono">{email}</span> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="off"
                  placeholder={email}
                />
              </div>

              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!matches || pending}
                  onClick={remove}
                >
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  Permanently delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    setConfirm("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
