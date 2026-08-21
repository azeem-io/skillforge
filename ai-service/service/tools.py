from __future__ import annotations

import json
import os
from typing import Any, Callable, Protocol

from .retrieval import Retriever, build_context


class HttpClient(Protocol):
    def post(self, url: str, json: dict[str, Any]) -> dict[str, Any]: ...


class HttpxClient:
    def __init__(self, timeout: float = 20.0) -> None:
        self._timeout = timeout

    def post(self, url: str, json: dict[str, Any]) -> dict[str, Any]:
        import httpx

        response = httpx.post(url, json=json, timeout=self._timeout)
        response.raise_for_status()
        return response.json()


class ToolBox:
    """
    The Career Planning Agent's tools. Each performs a real action against real
    data — three call python-analyzer, one searches the knowledge base. None
    return canned text.

    `context` carries the student's graph and demonstrated levels, supplied by
    the caller, so the model never has to be trusted to remember them.
    """

    def __init__(
        self,
        retriever: Retriever,
        context: dict[str, Any],
        http: HttpClient | None = None,
        analyzer_url: str | None = None,
    ) -> None:
        self._retriever = retriever
        self._context = context
        self._http = http or HttpxClient()
        self._analyzer = (
            analyzer_url
            or os.environ.get("PYTHON_ANALYZER_URL", "http://localhost:8085")
        ).rstrip("/")

    def _payload(self) -> dict[str, Any]:
        return {
            "skills": self._context.get("skills", []),
            "edges": self._context.get("edges", []),
            "requirements": self._context.get("requirements", []),
            "demonstrated": self._context.get("demonstrated", {}),
        }

    def analyze_student_skills(self) -> dict[str, Any]:
        result = self._http.post(f"{self._analyzer}/analyze", json=self._payload())
        return {
            "readiness_score": result["readiness_score"],
            "mastered": result["mastered"],
            "in_progress": result["in_progress"],
            "recommended_topics": result["recommended_topics"],
            "total_gaps": len(result["gaps"]),
        }

    def generate_skill_gap(self, limit: int = 8) -> dict[str, Any]:
        gaps = self._http.post(f"{self._analyzer}/gaps", json=self._payload())
        return {
            "gaps": [
                {
                    "skill": g["name"],
                    "current_level": g["current_level"],
                    "required_level": g["required_level"],
                    "weighted_score": g["score"],
                    "blocked_by": g["blocked_by"],
                }
                for g in gaps[:limit]
            ]
        }

    def create_roadmap(self) -> dict[str, Any]:
        roadmap = self._http.post(f"{self._analyzer}/roadmap", json=self._payload())
        return {
            "to_learn": roadmap["to_learn"],
            "total_weeks": roadmap["total_weeks"],
            "phases": [
                {
                    "phase": p["phase"],
                    "skills": p["names"],
                    "estimated_weeks": p["estimated_weeks"],
                }
                for p in roadmap["phases"]
            ],
        }

    def compare_target_roles(self) -> dict[str, Any]:
        roles = self._context.get("roles", [])
        if not roles:
            return {"error": "no roles supplied in context"}

        result = self._http.post(
            f"{self._analyzer}/compare",
            json={
                "skills": self._context.get("skills", []),
                "edges": self._context.get("edges", []),
                "demonstrated": self._context.get("demonstrated", {}),
                "roles": roles,
            },
        )
        return {
            "current_target": self._context.get("target_role"),
            "roles": result["roles"],
        }

    def search_learning_resources(self, query: str, k: int = 4) -> dict[str, Any]:
        results = self._retriever.search(query, k=k)
        return {
            "matches": [
                {"source": chunk.citation, "relevance": round(score, 3), "text": chunk.text}
                for chunk, score in results
            ]
        }

    def dispatch(self, name: str, arguments: str) -> str:
        try:
            args = json.loads(arguments) if arguments else {}
        except json.JSONDecodeError:
            return json.dumps({"error": f"could not parse arguments: {arguments}"})

        handlers: dict[str, Callable[..., dict[str, Any]]] = {
            "analyze_student_skills": lambda: self.analyze_student_skills(),
            "generate_skill_gap": lambda: self.generate_skill_gap(
                limit=int(args.get("limit", 8))
            ),
            "create_roadmap": lambda: self.create_roadmap(),
            "compare_target_roles": lambda: self.compare_target_roles(),
            "search_learning_resources": lambda: self.search_learning_resources(
                query=str(args.get("query", "")), k=int(args.get("k", 4))
            ),
        }

        handler = handlers.get(name)
        if handler is None:
            return json.dumps({"error": f"unknown tool: {name}"})

        try:
            return json.dumps(handler())
        except Exception as exc:
            return json.dumps({"error": f"{name} failed: {exc}"})


SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "analyze_student_skills",
            "description": (
                "Read the student's current profile: readiness score toward their "
                "target role, how many requirements are met, and what they can "
                "start on right now. Call this before giving any advice."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_skill_gap",
            "description": (
                "List the skills the student is missing for their target role, "
                "ranked by weighted importance, including what blocks each one."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "How many gaps to return. Default 8.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_roadmap",
            "description": (
                "Generate the ordered learning plan: phases derived from a "
                "topological sort of the prerequisite graph, with effort "
                "estimates. The ordering is computed, not invented."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_target_roles",
            "description": (
                "Score the student against every available target role at once "
                "and return them best-fit first, with readiness, skills "
                "remaining, estimated weeks and what they could start today. "
                "Call this whenever the student asks which goal to pick, or "
                "whether their current goal is the right one. The scores are "
                "computed — report them, never estimate your own."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_learning_resources",
            "description": (
                "Search the curated knowledge base for guidance on careers, "
                "sequencing, specific skills and project ideas. Use this to "
                "ground any claim about how or what to learn."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to look up."},
                    "k": {"type": "integer", "description": "Results. Default 4."},
                },
                "required": ["query"],
            },
        },
    },
]
