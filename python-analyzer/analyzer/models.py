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


class AnalysisResponse(BaseModel):
    readiness_score: int
    mastered: int
    in_progress: int
    gaps: list[Gap]
    recommended_topics: list[str]
    roadmap: Roadmap
    warnings: list[str] = Field(default_factory=list)
