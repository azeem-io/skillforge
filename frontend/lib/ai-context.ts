import "server-only";

import { me, roleGraph } from "@/lib/student";

export type Turn = { role: "user" | "assistant"; content: string };

/**
 * What the assistant is allowed to know about who it is talking to. Assembled
 * here rather than accepted from the browser: the client has no business
 * asserting what a student has demonstrated, and the analyzer payload is around
 * 20KB of taxonomy nobody should be uploading on every message.
 */
export async function assistantStudent() {
  const profile = await me();
  const roleSlug = profile?.targetRoleSlug ?? null;
  if (!roleSlug)
    return { roleSlug: null, demonstrated: {} as Record<string, number> };

  const { skills } = await roleGraph(roleSlug);
  const demonstrated: Record<string, number> = {};
  for (const skill of skills) {
    if (skill.level > 0) demonstrated[skill.slug] = skill.level;
  }
  return { roleSlug, demonstrated };
}

/** Trimmed to the text turns; tool-call frames stay server-side. */
export function historyFrom(body: unknown): Turn[] {
  const raw = (body as { history?: unknown })?.history;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is Turn =>
        !!t &&
        typeof (t as Turn).content === "string" &&
        ((t as Turn).role === "user" || (t as Turn).role === "assistant"),
    )
    .slice(-10)
    .map((t) => ({ role: t.role, content: t.content }));
}
