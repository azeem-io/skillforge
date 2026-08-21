"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

/** Better Auth's own minimum. Stated up front rather than after a failed
 *  submit — a rule you only learn by breaking it is a bad rule to have. */
const MIN_PASSWORD = 12;

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "Sign in",
    subtitle: "Pick up where you left off.",
    submit: "Sign in",
    endpoint: "/api/auth/sign-in/email",
    switchHref: "/register",
    switchLabel: "New here?",
    switchCta: "Create an account",
  },
  register: {
    title: "Create your account",
    subtitle: "Assess your skills, find the gaps, get a roadmap.",
    submit: "Create account",
    endpoint: "/api/auth/sign-up/email",
    switchHref: "/login",
    switchLabel: "Already have an account?",
    switchCta: "Sign in",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (mode === "register" && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setPending(true);
    const result = await apiFetch(copy.endpoint, {
      method: "POST",
      body: {
        email: String(form.get("email") ?? ""),
        password,
        ...(mode === "register" ? { name: String(form.get("name") ?? "") } : {}),
      },
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // The session cookie is set by the response; refresh so Server Components
    // re-read it rather than rendering the signed-out shell from cache.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@university.edu"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? MIN_PASSWORD : undefined}
          aria-describedby={mode === "register" ? "password-hint" : undefined}
        />
        {mode === "register" && (
          <p id="password-hint" className="text-muted-foreground text-xs">
            At least {MIN_PASSWORD} characters. Hashed with argon2id — never stored
            in plain text.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Working…" : copy.submit}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {copy.switchLabel}{" "}
        <Link href={copy.switchHref} className="text-primary hover:underline">
          {copy.switchCta}
        </Link>
      </p>
    </form>
  );
}
