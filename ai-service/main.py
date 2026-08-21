from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from service.agent import CareerPlanningAgent
from service.deepseek import DeepSeekClient
from service.knowledge import load_chunks
from service.retrieval import FastEmbedder, Retriever, build_context
from service.tools import ToolBox

KB_PATH = Path(os.environ.get("KNOWLEDGE_BASE_PATH", "/app/knowledge-base"))
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Embedding the corpus at boot, not on first search: the model load alone is
    # ~10s and would otherwise be paid by whoever asks the first question.
    # Non-fatal, because /expand and /agent do not need retrieval.
    try:
        await asyncio.to_thread(retriever().index)
    except Exception as exc:
        print(f"[warm-up] retrieval unavailable, will retry per request: {exc}")
    yield


router = APIRouter()


app = FastAPI(
    title="SkillForge AI",
    description="Generation, retrieval and the career planning agent.",
    version="0.1.0",
    lifespan=lifespan,
)


@lru_cache(maxsize=1)
def retriever() -> Retriever:
    return Retriever(load_chunks(KB_PATH), FastEmbedder(EMBEDDING_MODEL))


@lru_cache(maxsize=1)
def client() -> DeepSeekClient:
    return DeepSeekClient()


class SkillScore(BaseModel):
    name: str = ""
    correct: int = 0
    total: int = 0


class AssessmentRecap(BaseModel):
    """
    One sitting. The frontend speaks camelCase, so the aliases are the wire
    names and the snake_case ones are what this file reads.
    """

    model_config = ConfigDict(populate_by_name=True)

    slug: str = ""
    title: str = ""
    score: int | None = None
    max_score: int | None = Field(default=None, alias="maxScore")
    completed_at: str | None = Field(default=None, alias="completedAt")
    # Worst first, and only for the most recent attempt.
    weakest: list[SkillScore] = Field(default_factory=list)


class StudentContext(BaseModel):
    skills: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    requirements: list[dict[str, Any]] = Field(default_factory=list)
    demonstrated: dict[str, int] = Field(default_factory=dict)
    # Every role with its requirements, so compare_target_roles can rank them.
    roles: list[dict[str, Any]] = Field(default_factory=list)
    target_role: str | None = None
    # Most recent first. A level says where the student is; these say what
    # happened, which is what "how did I do?" is actually asking about.
    recent_assessments: list[AssessmentRecap] = Field(default_factory=list)
    # Every assessment that exists right now, not just ones this student has
    # sat — so the assistant can link one without a slug list hardcoded here
    # going stale the next time an assessment is added or removed.
    available_assessments: list[dict[str, str]] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str
    k: int = 4


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


# Enough for a follow-up to make sense without letting a long session push the
# retrieved sources out of the model's attention.
MAX_HISTORY = 10


class ChatRequest(BaseModel):
    question: str
    k: int = 4
    context: StudentContext | None = None
    history: list[Turn] = Field(default_factory=list)


class AgentRequest(BaseModel):
    question: str
    context: StudentContext = Field(default_factory=StudentContext)
    history: list[Turn] = Field(default_factory=list)


class ExpandRequest(BaseModel):
    skill: str
    subcategory: str = ""
    count: int = 3


CHAT_SYSTEM = """You are the SkillForge career assistant, talking with a student \
who wants a career in technology.

- Prefer the sources below, and cite one as [1], [2] matching its number when you use it.
- The sources are a small knowledge base, not the whole world. When they do not \
cover something, say so in a clause and then answer from what you know anyway. \
Refusing outright is not an answer.
- This is a conversation. Read the earlier turns: treat "it", "that" and "why" as \
referring to them, and answer a follow-up directly instead of restating everything.
- Write markdown. Short paragraphs, bold for the thing that matters, a list only \
when there is genuinely more than one item. No headings on a two-line answer.
- Never state a readiness percentage, a gap count, or roadmap phase order. Those \
are computed by the analyzer and guessing them would contradict the rest of the \
app. Say what they depend on instead.
- When the student asks how they did, what they got wrong, or what to review \
next, answer from the assessment results below rather than the skill levels — a \
level is where they stand now, an attempt is what actually happened. If no \
assessment is listed, say they have not taken one yet instead of guessing a score.
- When you recommend taking or retaking an assessment, link it as markdown from \
the assessment list below, written as [the Python assessment](/assessments/\
python-fundamentals). Never invent a slug or use one from your own knowledge — \
only ones printed in that list exist. If the list is not provided or nothing \
in it fits, name the topic without a link.
- Be concrete and brief. A student wants the next action, not an essay."""


def assessment_catalog(context: StudentContext | None) -> str:
    """
    Every assessment slug that actually exists, supplied per-request by the
    frontend rather than hardcoded here — the one place CHAT_SYSTEM used to
    hardcode a slug list that went stale the moment an assessment was added.
    """
    if context is None:
        return ""

    lines = [
        f"- [{a.get('title') or a['slug']}](/assessments/{a['slug']})"
        for a in context.available_assessments
        if a.get("slug")
    ]
    if not lines:
        return ""

    return "\n\nAssessments that exist right now — link only from this list:\n" + "\n".join(
        lines
    )


def assessment_summary(attempts: list[AssessmentRecap]) -> str:
    """
    The recent sittings as one line each. Scores are quoted back verbatim —
    the model is not asked to average them or turn them into a percentage.
    """
    if not attempts:
        return ""

    lines = []
    for attempt in attempts:
        parts = [attempt.title or attempt.slug]
        if attempt.score is not None and attempt.max_score is not None:
            parts.append(f"scored {attempt.score}/{attempt.max_score}")
        if attempt.completed_at:
            parts.append(f"on {attempt.completed_at[:10]}")
        if attempt.weakest:
            weakest = ", ".join(
                f"{skill.name} {skill.correct}/{skill.total}" for skill in attempt.weakest
            )
            parts.append(f"weakest: {weakest}")
        lines.append(f"- {' — '.join(parts)}")

    return (
        "\n\nAssessments they have taken, most recent first:\n"
        + "\n".join(lines)
        + "\nThese are graded results, not self-reported claims. Quote the scores "
        "as they stand and point at the weakest skills when asked what to review; "
        "a skill level on its own cannot say which questions went wrong."
    )


def student_summary(context: StudentContext | None) -> str:
    """
    Demonstrated levels and recent assessment results folded into the RAG
    prompt. Enough for the model to tailor an answer without the tool-calling
    round trips /agent needs — it still cannot compute, so anything numeric
    belongs on /agent.
    """
    if context is None:
        return ""

    summary = ""
    if context.demonstrated:
        levels = ", ".join(
            f"{slug} (level {level})"
            for slug, level in sorted(context.demonstrated.items())
        )
        target = (
            f" Their target role is {context.target_role}." if context.target_role else ""
        )
        summary = (
            f"\n\nThe student has demonstrated: {levels}.{target} Use this to tailor "
            "the answer, but do not state readiness percentages or counts — those "
            "are computed elsewhere and guessing them would be wrong."
        )
    elif context.target_role:
        summary = f"\n\nThe student's target role is {context.target_role}."

    return summary + assessment_summary(context.recent_assessments)


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "llm_configured": client().configured,
        "chunks": retriever().size,
        "embeddings_ready": retriever().indexed,
    }


@router.post("/search")
def search(request: SearchRequest) -> dict[str, Any]:
    """Retrieval only — no generation. Useful for showing what RAG retrieved."""
    results = retriever().search(request.query, k=request.k)
    return {
        "matches": [
            {"source": c.citation, "type": c.doc_type, "relevance": round(s, 3), "text": c.text}
            for c, s in results
        ]
    }


@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    """RAG: retrieve from the knowledge base, then answer grounded in it."""
    results = retriever().search(request.question, k=request.k)
    if not results:
        raise HTTPException(503, "knowledge base is empty")

    context = build_context(results)
    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                f"{CHAT_SYSTEM}"
                f"{student_summary(request.context)}"
                f"{assessment_catalog(request.context)}"
                f"\n\n{context}"
            ),
        }
    ]
    messages.extend(t.model_dump() for t in request.history[-MAX_HISTORY:])
    messages.append({"role": "user", "content": request.question})

    try:
        message = client().chat(messages)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc

    return {
        "answer": message.get("content") or "",
        "sources": [{"source": c.citation, "relevance": round(s, 3)} for c, s in results],
    }


@router.post("/agent")
def agent(request: AgentRequest) -> dict[str, Any]:
    """The Career Planning Agent. Six tools, real actions against real data."""
    tools = ToolBox(retriever=retriever(), context=request.context.model_dump())
    history = [t.model_dump() for t in request.history[-MAX_HISTORY:]]
    try:
        result = CareerPlanningAgent(client(), tools).run(request.question, history)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc

    return {
        "answer": result.answer,
        "stopped_early": result.stopped_early,
        "steps": [
            {"tool": s.tool, "arguments": s.arguments, "result": s.result}
            for s in result.steps
        ],
    }


@router.post("/expand")
def expand(request: ExpandRequest) -> dict[str, Any]:
    """
    The wand. Breaks a skill into sub-skills, grounded in the knowledge base.
    Returns structured rows the graph inserts; it never invents prerequisites
    outside the requested skill.
    """
    results = retriever().search(request.skill, k=3)
    context = build_context(results)

    messages = [
        {
            "role": "system",
            "content": (
                f"Break the skill into exactly {request.count} concrete sub-skills "
                "a student could learn and be assessed on separately. Use the "
                "sources for grounding where relevant.\n\n"
                'Reply with JSON only: {"sub_skills":[{"name":"...",'
                '"description":"..."}]}'
                f"\n\n{context}"
            ),
        },
        {
            "role": "user",
            "content": f"Skill: {request.skill}\nArea: {request.subcategory}",
        },
    ]

    try:
        message = client().chat(messages)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc

    raw = (message.get("content") or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].removeprefix("json").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(502, "model did not return valid JSON")

    return {
        "parent": request.skill,
        "sub_skills": parsed.get("sub_skills", [])[: request.count],
        "sources": [c.citation for c, _ in results],
    }


# Mounted twice: bare paths for internal callers and the healthcheck, and under
# /api/ai because the gateway forwards the request path unchanged, the same way
# skill-service mounts /api/skills itself.
app.include_router(router)
app.include_router(router, prefix="/api/ai")
