import { NextResponse } from "next/server";

import { aiUser, jsonBody } from "@/app/ai/guard";
import { agentStudent, historyFrom } from "@/lib/ai-context";

const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

export async function POST(request: Request) {
  const user = await aiUser();
  if (user instanceof NextResponse) return user;

  const body = await jsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const { question } = body as { question?: unknown };
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const { context, recentAssessments } = await agentStudent();

  try {
    const upstream = await fetch(`${AI_SERVICE}/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        history: historyFrom(body),
        // Carried on the request but kept out of the prompt: the agent only
        // pays for the attempts if it calls get_assessment_history.
        context: { ...context, recent_assessments: recentAssessments },
      }),
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
