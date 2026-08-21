import { NextResponse } from "next/server";

// Temporary: the frontend will call the gateway, not ai-service directly, once
// api-gateway exists. Same request shape either way.
const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const upstream = await fetch(`${AI_SERVICE}/expand`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skill: body.skill,
        subcategory: body.subcategory ?? "",
        count: body.count ?? 3,
      }),
      signal: AbortSignal.timeout(30_000),
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
        hint: `Start it: cd ai-service && KNOWLEDGE_BASE_PATH=../rag/knowledge-base .venv/bin/uvicorn main:app --port 8084`,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
