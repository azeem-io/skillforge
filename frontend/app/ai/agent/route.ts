import { NextResponse } from "next/server";

import { DEMO_DEMONSTRATED, DEMO_TARGET_ROLE } from "@/lib/demo-student";
import { studentContext } from "@/lib/skills";

const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

export async function POST(request: Request) {
  const body = await request.json();

  // The context is assembled here rather than passed from the browser: it is
  // roughly 20KB of taxonomy, and the client has no business asserting what
  // the student has demonstrated.
  const context = await studentContext(
    DEMO_DEMONSTRATED,
    body.role ?? DEMO_TARGET_ROLE,
  );

  try {
    const upstream = await fetch(`${AI_SERVICE}/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: body.question, context }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json(
        { error: `ai-service returned ${upstream.status}`, detail },
        { status: upstream.status },
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "ai-service unreachable",
        hint: "Start ai-service on port 8084 and python-analyzer on 8085.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
