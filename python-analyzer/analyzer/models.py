from __future__ import annotations

from pydantic import BaseModel, Field


class Skill(BaseModel):
    slug: str
    name: str
    subcategory: str = ""
    category: str = ""


class Edge(BaseModel):
    """`skill` requires `prerequisite` first."""

    skill: str
    prerequisite: str
    strength: str = "hard"


class Requirement(BaseModel):
    skill: str
    required_level: int = Field(ge=1, le=5)
    weight: int = Field(default=3, ge=1, le=5)


class AnalysisRequest(BaseModel):
    skills: list[Skill]
    edges: list[Edge]
    requirements: list[Requirement]
    # slug -> demonstrated level, 1-5. Absent means never demonstrated.
    demonstrated: dict[str, int] = Field(default_factory=dict)


class Gap(BaseModel):
    skill: str
    name: str
    current_level: int
    required_level: int
    weight: int
    deficit: int
    score: int
    blocked_by: list[str] = Field(default_factory=list)


class Phase(BaseModel):
    phase: int
    skills: list[str]
    names: list[str]
    estimated_weeks: int
    unlocks: int


class Roadmap(BaseModel):
    target_skills: int
    with_prerequisites: int
    to_learn: int
    total_weeks: int
    phases: list[Phase]


class ServiceSkill(BaseModel):
    """One row of skill-service's SkillRow, which is camelCase and carries ids."""

    model_config = {"populate_by_name": True}

    id: str
    slug: str
    name: str
    subcategory: str = ""
    category: str = ""
    level: int = 0
    required_level: int = Field(default=2, alias="requiredLevel")
    weight: int = 3
    # Ids, not slugs — resolved against the ids in this same payload.
    prerequisites: list[str] = Field(default_factory=list)


class PlanRequest(BaseModel):
    role: dict[str, str] = Field(default_factory=dict)
    skills: list[ServiceSkill]


class PlanSkill(BaseModel):
    slug: str
    ordinal: int
    gapScore: int


class PlanPhase(BaseModel):
    phase: int
    title: str
    rationale: str | None = None
    estimatedWeeks: int
    skills: list[PlanSkill]


class PlanResponse(BaseModel):
    """Field names are camelCase to match skill-service's AnalyzerRoadmap."""

    phases: list[PlanPhase]
    readinessScore: int
    narration: str | None = None


class RoleRequirements(BaseModel):
    slug: str
    name: str
    requirements: list[Requirement]


class ComparisonRequest(BaseModel):
    skills: list[Skill]
    edges: list[Edge]
    demonstrated: dict[str, int] = Field(default_factory=dict)
    roles: list[RoleRequirements]


class RoleComparison(BaseModel):
    slug: str
    name: str
    readiness_score: int
    mastered: int
    in_progress: int
    requirements: int
    skills_remaining: int
    total_weeks: int
    # Startable today. A narrow first phase means a shorter run-up than the
    # readiness percentage alone suggests.
    first_phase: list[str]


class ComparisonResponse(BaseModel):
    roles: list[RoleComparison]


class AnalysisResponse(BaseModel):
    readiness_score: int
    mastered: int
    in_progress: int
    gaps: list[Gap]
    recommended_topics: list[str]
    roadmap: Roadmap
    warnings: list[str] = Field(default_factory=list)
