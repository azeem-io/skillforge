from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .deepseek import ChatClient
from .tools import SCHEMAS, ToolBox

MAX_STEPS = 6

SYSTEM_PROMPT = """You are the SkillForge career planning assistant.

You help students understand what skills they are missing for a target role and
in what order to learn them.

Rules:
- Call analyze_student_skills before giving advice. Never guess at their level.
- Ground claims about how or what to learn in search_learning_resources. If the
  knowledge base does not cover something, say so rather than inventing it.
- The roadmap's phase ordering comes from create_roadmap and is computed from a
  prerequisite graph. Never reorder it or invent phases. You explain the plan;
  you do not decide it.
- Never recommend a skill the student cannot start yet. If something is blocked,
  say what blocks it.
- For "which goal should I pick", call compare_target_roles and argue from the
  numbers it returns. Readiness measures distance, not suitability: a lower
  score means a longer path, not a worse fit. Say so when recommending.
- Be specific and brief. Cite sources as [1], [2] matching the search results."""


@dataclass
class AgentStep:
    tool: str
    arguments: str
    result: str


@dataclass
class AgentResult:
    answer: str
    steps: list[AgentStep] = field(default_factory=list)
    stopped_early: bool = False


class CareerPlanningAgent:
    """
    Tool-calling loop. The model chooses tools; the tools do real work against
    python-analyzer and the knowledge base, and their output is fed back until
    the model answers without asking for another one.
    """

    def __init__(self, client: ChatClient, tools: ToolBox) -> None:
        self._client = client
        self._tools = tools

    def run(self, question: str, history: list[dict[str, Any]] | None = None) -> AgentResult:
        messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history or [])
        messages.append({"role": "user", "content": question})

        steps: list[AgentStep] = []

        for _ in range(MAX_STEPS):
            message = self._client.chat(messages, tools=SCHEMAS)
            calls = message.get("tool_calls") or []

            if not calls:
                return AgentResult(answer=message.get("content") or "", steps=steps)

            messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content"),
                    "tool_calls": calls,
                }
            )

            for call in calls:
                fn = call["function"]
                output = self._tools.dispatch(fn["name"], fn.get("arguments") or "")
                steps.append(
                    AgentStep(
                        tool=fn["name"],
                        arguments=fn.get("arguments") or "",
                        result=output,
                    )
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": output,
                    }
                )

        # Out of steps with tools still being requested. Returning the tool
        # output unsummarised is more useful than an empty answer.
        return AgentResult(
            answer=(
                "I gathered the analysis below but ran out of steps before "
                "summarising it."
            ),
            steps=steps,
            stopped_early=True,
        )
