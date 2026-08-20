"""
End-to-end smoke test against the live DeepSeek API and the real knowledge base.

    cd ai-service
    set -a; . ../.env; set +a
    KNOWLEDGE_BASE_PATH=../rag/knowledge-base .venv/bin/python smoke.py

The agent step calls python-analyzer's classes in process rather than over HTTP,
so this runs without docker-compose. Once compose is up, the same agent talks to
the real service and nothing else changes.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python-analyzer"))

from service.agent import CareerPlanningAgent  # noqa: E402
from service.deepseek import DeepSeekClient  # noqa: E402
from service.knowledge import load_chunks  # noqa: E402
from service.retrieval import FastEmbedder, Retriever, build_context  # noqa: E402
from service.tools import ToolBox  # noqa: E402

KB = Path(os.environ.get("KNOWLEDGE_BASE_PATH", "../rag/knowledge-base"))


class InProcessAnalyzer:
    """Speaks the HttpClient protocol, runs python-analyzer's classes directly."""

    def post(self, url: str, json: dict) -> object:
        from analyzer.analyzer import SkillAnalyzer
        from analyzer.models import AnalysisRequest

        analyzer = SkillAnalyzer(AnalysisRequest(**json))
        endpoint = url.rstrip("/").split("/")[-1]

        if endpoint == "analyze":
            return analyzer.analyze().model_dump()
        if endpoint == "gaps":
            return [g.model_dump() for g in analyzer.identify_gaps()]
        if endpoint == "roadmap":
            return analyzer.analyze().roadmap.model_dump()
        raise ValueError(endpoint)


def rule(title: str) -> None:
    print(f"\n{'=' * 62}\n{title}\n{'=' * 62}")


def main() -> int:
    client = DeepSeekClient()
    if not client.configured:
        print("DEEPSEEK_API_KEY is not set. Run: set -a; . ../.env; set +a")
        return 1

    rule("1. Knowledge base")
    chunks = load_chunks(KB)
    print(f"{len(chunks)} chunks from {len({c.doc_id for c in chunks})} documents")

    rule("2. Embedding + retrieval  (first run downloads ~50MB)")
    retriever = Retriever(chunks, FastEmbedder())
    question = "Should I learn React before JavaScript?"
    results = retriever.search(question, k=3)
    for c, score in results:
        print(f"  {score:.3f}  {c.citation}")

    rule("3. RAG answer, grounded in those sources")
    answer = client.chat(
        [
            {
                "role": "system",
                "content": (
                    "Answer using only the sources below. Cite as [1], [2].\n\n"
                    + build_context(results)
                ),
            },
            {"role": "user", "content": question},
        ]
    )
    print(answer.get("content"))

    rule("4. Career Planning Agent, real tool calls")
    context = {
        "skills": [
            {"slug": s, "name": s.replace("-", " ").title()}
            for s in ["python", "numpy", "pandas", "supervised-learning", "sql"]
        ],
        "edges": [
            {"skill": "numpy", "prerequisite": "python"},
            {"skill": "pandas", "prerequisite": "numpy"},
            {"skill": "supervised-learning", "prerequisite": "pandas"},
        ],
        "requirements": [
            {"skill": "supervised-learning", "required_level": 5, "weight": 5},
            {"skill": "sql", "required_level": 3, "weight": 3},
        ],
        "demonstrated": {"python": 4, "numpy": 2},
    }

    tools = ToolBox(retriever=retriever, context=context, http=InProcessAnalyzer())
    result = CareerPlanningAgent(client, tools).run(
        "Analyse my profile and tell me what I should learn next, and why."
    )

    for step in result.steps:
        print(f"  -> called {step.tool}  {step.result[:90]}...")
    print(f"\n{result.answer}")

    rule("5. Expand wand")
    expand = client.chat(
        [
            {
                "role": "system",
                "content": (
                    'Break the skill into exactly 3 sub-skills. JSON only: '
                    '{"sub_skills":[{"name":"...","description":"..."}]}'
                ),
            },
            {"role": "user", "content": "Skill: Feature Engineering"},
        ]
    )
    print(expand.get("content"))

    print("\nAll five stages completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
