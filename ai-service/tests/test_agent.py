import json
from pathlib import Path

from service.agent import CareerPlanningAgent, MAX_STEPS
from service.knowledge import load_chunks
from service.retrieval import Retriever
from service.tools import SCHEMAS, ToolBox

KB = Path(__file__).resolve().parents[2] / "rag" / "knowledge-base"


class StubEmbedder:
    def embed(self, texts):
        return [[float(len(t))] for t in texts]


class StubHttp:
    """Stands in for python-analyzer."""

    def __init__(self, responses=None, fail=False):
        self.calls = []
        self.fail = fail
        self._responses = responses or {
            "/analyze": {
                "readiness_score": 14,
                "mastered": 0,
                "in_progress": 5,
                "recommended_topics": ["Pandas", "NumPy"],
                "gaps": [{"name": "Pandas"}, {"name": "SQL"}],
            },
            "/gaps": [
                {
                    "name": "Model Evaluation",
                    "current_level": 0,
                    "required_level": 5,
                    "score": 25,
                    "blocked_by": ["supervised-learning"],
                }
            ],
            "/roadmap": {
                "to_learn": 28,
                "total_weeks": 65,
                "phases": [
                    {"phase": 1, "names": ["Python", "Git"], "estimated_weeks": 4}
                ],
            },
            "/compare": {
                "roles": [
                    {
                        "slug": "frontend-engineer",
                        "name": "Frontend Engineer",
                        "readiness_score": 18,
                        "skills_remaining": 20,
                    },
                    {
                        "slug": "ai-engineer",
                        "name": "AI Engineer",
                        "readiness_score": 14,
                        "skills_remaining": 28,
                    },
                ]
            },
        }

    def post(self, url, json):
        if self.fail:
            raise RuntimeError("analyzer unreachable")
        path = "/" + url.rstrip("/").split("/")[-1]
        self.calls.append(path)
        return self._responses[path]


class ScriptedClient:
    """Replays a fixed sequence of model responses."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.seen_tools = None

    def chat(self, messages, tools=None):
        self.seen_tools = tools
        return self._responses.pop(0)


def tool_call(name, args="{}", call_id="c1"):
    return {
        "content": None,
        "tool_calls": [
            {"id": call_id, "type": "function",
             "function": {"name": name, "arguments": args}}
        ],
    }


def toolbox(http=None):
    return ToolBox(
        retriever=Retriever(load_chunks(KB), StubEmbedder()),
        context={"skills": [], "edges": [], "requirements": [], "demonstrated": {}},
        http=http or StubHttp(),
        analyzer_url="http://analyzer",
    )


class TestToolBox:
    def test_analyze_calls_the_analyzer(self):
        http = StubHttp()
        result = toolbox(http).analyze_student_skills()
        assert http.calls == ["/analyze"]
        assert result["readiness_score"] == 14

    def test_gap_tool_respects_limit(self):
        assert len(toolbox().generate_skill_gap(limit=1)["gaps"]) == 1

    def test_gap_tool_reports_what_blocks_a_skill(self):
        gap = toolbox().generate_skill_gap()["gaps"][0]
        assert gap["blocked_by"] == ["supervised-learning"]

    def test_roadmap_tool_returns_phases(self):
        assert toolbox().create_roadmap()["phases"][0]["phase"] == 1

    def test_resource_search_hits_the_knowledge_base(self):
        matches = toolbox().search_learning_resources("kubernetes", k=2)["matches"]
        assert len(matches) == 2
        assert all("source" in m for m in matches)

    def test_dispatch_reports_unknown_tool(self):
        assert "unknown tool" in toolbox().dispatch("nope", "{}")

    def test_dispatch_survives_bad_json(self):
        assert "could not parse" in toolbox().dispatch("create_roadmap", "{oops")

    def test_dispatch_surfaces_downstream_failure(self):
        out = json.loads(toolbox(StubHttp(fail=True)).dispatch("create_roadmap", "{}"))
        assert "analyzer unreachable" in out["error"]


class TestCompareTargetRoles:
    def _box(self, http=None):
        return ToolBox(
            retriever=Retriever(load_chunks(KB), StubEmbedder()),
            context={
                "skills": [],
                "edges": [],
                "demonstrated": {"html": 3},
                "target_role": "ai-engineer",
                "roles": [{"slug": "ai-engineer", "name": "AI Engineer", "requirements": []}],
            },
            http=http or StubHttp(),
            analyzer_url="http://analyzer",
        )

    def test_ranks_roles_and_reports_the_current_target(self):
        result = self._box().compare_target_roles()
        assert result["current_target"] == "ai-engineer"
        assert result["roles"][0]["slug"] == "frontend-engineer"

    def test_errors_when_no_roles_are_supplied(self):
        # Without roles the analyzer would be handed an empty comparison and
        # return nothing, which the model reads as "no good options".
        result = toolbox().compare_target_roles()
        assert "error" in result

    def test_does_not_call_the_analyzer_without_roles(self):
        http = StubHttp()
        toolbox(http).compare_target_roles()
        assert http.calls == []


class TestSchemas:
    def test_every_tool_is_declared(self):
        names = {s["function"]["name"] for s in SCHEMAS}
        assert names == {
            "analyze_student_skills",
            "generate_skill_gap",
            "create_roadmap",
            "compare_target_roles",
            "search_learning_resources",
        }

    def test_every_schema_has_a_description(self):
        assert all(s["function"]["description"].strip() for s in SCHEMAS)


class TestAgent:
    def test_answers_without_tools_when_none_needed(self):
        client = ScriptedClient([{"content": "Hello.", "tool_calls": None}])
        result = CareerPlanningAgent(client, toolbox()).run("hi")
        assert result.answer == "Hello."
        assert result.steps == []

    def test_feeds_tool_output_back_and_answers(self):
        client = ScriptedClient([
            tool_call("analyze_student_skills"),
            {"content": "You are 14% ready.", "tool_calls": None},
        ])
        result = CareerPlanningAgent(client, toolbox()).run("where am i?")
        assert result.answer == "You are 14% ready."
        assert [s.tool for s in result.steps] == ["analyze_student_skills"]

    def test_chains_multiple_tools(self):
        client = ScriptedClient([
            tool_call("analyze_student_skills", call_id="a"),
            tool_call("create_roadmap", call_id="b"),
            {"content": "Here is your plan.", "tool_calls": None},
        ])
        result = CareerPlanningAgent(client, toolbox()).run("plan me")
        assert [s.tool for s in result.steps] == [
            "analyze_student_skills",
            "create_roadmap",
        ]

    def test_tool_schemas_are_offered_to_the_model(self):
        client = ScriptedClient([{"content": "ok", "tool_calls": None}])
        CareerPlanningAgent(client, toolbox()).run("hi")
        assert client.seen_tools == SCHEMAS

    def test_stops_after_max_steps(self):
        client = ScriptedClient([tool_call("create_roadmap")] * (MAX_STEPS + 2))
        result = CareerPlanningAgent(client, toolbox()).run("loop")
        assert result.stopped_early
        assert len(result.steps) == MAX_STEPS
