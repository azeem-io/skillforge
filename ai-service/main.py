from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

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


class StudentContext(BaseModel):
    skills: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    requirements: list[dict[str, Any]] = Field(default_factory=list)
    demonstrated: dict[str, int] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str
    k: int = 4


class ChatRequest(BaseModel):
    question: str
    k: int = 4


class AgentRequest(BaseModel):
    question: str
    context: StudentContext = Field(default_factory=StudentContext)


class ExpandRequest(BaseModel):
    skill: str
    subcategory: str = ""
    count: int = 3


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "llm_configured": client().configured,
        "chunks": retriever().size,
        "embeddings_ready": retriever().indexed,
    }


@app.post("/search")
def search(request: SearchRequest) -> dict[str, Any]:
    """Retrieval only — no generation. Useful for showing what RAG retrieved."""
    results = retriever().search(request.query, k=request.k)
    return {
        "matches": [
            {"source": c.citation, "type": c.doc_type, "relevance": round(s, 3), "text": c.text}
            for c, s in results
        ]
    }


@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    """RAG: retrieve from the knowledge base, then answer grounded in it."""
    results = retriever().search(request.question, k=request.k)
    if not results:
        raise HTTPException(503, "knowledge base is empty")

    context = build_context(results)
    messages = [
        {
            "role": "system",
            "content": (
                "Answer using only the sources below. If they do not cover the "
                "question, say so plainly rather than guessing. Cite as [1], [2]."
                f"\n\n{context}"
            ),
        },
        {"role": "user", "content": request.question},
    ]

    try:
        message = client().chat(messages)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc

    return {
        "answer": message.get("content") or "",
        "sources": [{"source": c.citation, "relevance": round(s, 3)} for c, s in results],
    }


@app.post("/agent")
def agent(request: AgentRequest) -> dict[str, Any]:
    """The Career Planning Agent. Four tools, real actions against real data."""
    tools = ToolBox(retriever=retriever(), context=request.context.model_dump())
    try:
        result = CareerPlanningAgent(client(), tools).run(request.question)
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


@app.post("/expand")
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
