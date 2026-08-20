import { NextResponse } from "next/server";

const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const upstream = await fetch(`${AI_SERVICE}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: body.question, k: body.k ?? 4 }),
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
