# python-analyzer

Skill gap analysis and roadmap generation. Stateless — `skill-service` sends the
graph and the student's demonstrated levels, this returns the analysis.

## Classes

| Class | Responsibility |
|---|---|
| `SkillGraph` | The prerequisite DAG: closure, cycle detection, topological layering |
| `SkillGapCalculator` | Demonstrated levels vs role requirements, weighted |
| `RoadmapGenerator` | Gaps to ordered phases with effort estimates |
| `SkillAnalyzer` | Facade — `calculate_score()`, `identify_gaps()`, `recommend_topics()` |

Two module-level functions sit beside them, each serving one caller's shape:
`plan()` for skill-service and `compare_roles()` for the agent's
`compare_target_roles` tool.

## Endpoints

`GET /health` · `POST /analyze` · `POST /gaps` · `POST /roadmap` · `POST /plan`
· `POST /compare` · `POST /score`

Mounted twice: bare paths for ai-service and skill-service, and under
`/api/analysis` for the gateway.

**`/roadmap` and `/plan` are not the same endpoint.** `/roadmap` speaks
ai-service's `AnalysisRequest`; `/plan` speaks skill-service's `SkillRow`.
Two shapes on purpose — changing one does not change the other.

## Local

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest                      # 37 tests
.venv/bin/uvicorn main:app --reload --port 8085
```

Docs at `http://localhost:8085/docs`.

## Note on ordering

Phase order is a topological layering of the prerequisite graph — you cannot
study a skill before what it depends on, however badly you need it. Weight
decides order *within* a phase, never across phases. No LLM is involved.
