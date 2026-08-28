import { NextResponse } from "next/server";

import { aiUser, jsonBody } from "@/app/ai/guard";

const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8084";

/** The graph's expand wand asks for three sub-skills; more is a model bill. */
const MAX_SUB_SKILLS = 5;

export async function POST(request: Request) {
  const user = await aiUser();
  if (user instanceof NextResponse) return user;

  const body = await jsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const { skill, subcategory, count } = body as {
    skill?: unknown;
    subcategory?: unknown;
    count?: unknown;
  };
  if (typeof skill !== "string" || !skill.trim()) {
    return NextResponse.json({ error: "No skill to expand." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${AI_SERVICE}/expand`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skill,
        subcategory: typeof subcategory === "string" ? subcategory : "",
        count:
          typeof count === "number"
            ? Math.min(Math.max(Math.trunc(count), 1), MAX_SUB_SKILLS)
            : 3,
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
