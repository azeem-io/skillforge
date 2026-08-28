import { NextResponse } from "next/server";

import { aiUser, jsonBody } from "@/app/ai/guard";
import { assistantStudent, historyFrom } from "@/lib/ai-context";

const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

export async function POST(request: Request) {
  const user = await aiUser();
  if (user instanceof NextResponse) return user;

  const body = await jsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const { question, k } = body as { question?: unknown; k?: unknown };
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const { roleSlug, demonstrated, recentAssessments, availableAssessments } =
    await assistantStudent();

  try {
    const upstream = await fetch(`${AI_SERVICE}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        k: typeof k === "number" ? k : 4,
        history: historyFrom(body),
        context: {
          demonstrated,
          target_role: roleSlug,
          recent_assessments: recentAssessments,
          available_assessments: availableAssessments,
        },
      }),
      signal: AbortSignal.timeout(45_000),
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
        hint: "Start ai-service on port 8084.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
