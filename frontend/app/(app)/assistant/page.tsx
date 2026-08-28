import type { Metadata } from "next";

import { AssistantChat } from "@/components/ai/assistant-chat";
import { requireUser } from "@/lib/student";

export const metadata: Metadata = { title: "Assistant" };

// Per-request like the rest of (app): the thread below is one student's,
// resolved from their session, never a cached page shared between accounts.
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await requireUser();
  return <AssistantChat userId={user.userId} />;
}
