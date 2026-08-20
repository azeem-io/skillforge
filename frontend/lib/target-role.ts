import "server-only";

import { DEMO_TARGET_ROLE } from "./demo-student";
import { roles } from "./skills";

export type RoleOption = Awaited<ReturnType<typeof roles>>[number];

// roleSkillGraph throws on an unknown slug, so a hand-typed ?role= would 500
// the page. Validate against the seeded roles and fall back instead.
export async function resolveRole(param?: string) {
  const options = await roles();
  const match = options.find((r) => r.slug === param);
  return { slug: match?.slug ?? DEMO_TARGET_ROLE, options };
}
