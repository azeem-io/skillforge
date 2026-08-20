from __future__ import annotations

from collections import Counter

from .gaps import SkillGapCalculator
from .graph import SkillGraph
from .models import (
    AnalysisRequest,
    AnalysisResponse,
    ComparisonRequest,
    ComparisonResponse,
    Edge,
    Gap,
    PlanPhase,
    PlanRequest,
    PlanResponse,
    PlanSkill,
    Requirement,
    RoleComparison,
    Skill,
)
from .roadmap import RoadmapGenerator

# How many topics to put in front of a student at once.
TOPIC_LIMIT = 6


class SkillAnalyzer:
    """
    Entry point for the whole analysis. Owns a SkillGraph, a
    SkillGapCalculator and a RoadmapGenerator, and exposes the three
    operations the rest of the system asks for.
    """

    def __init__(self, request: AnalysisRequest) -> None:
        self._graph = SkillGraph(request.skills, request.edges)
        self._requirements = request.requirements
        self._demonstrated = request.demonstrated
        self._calculator = SkillGapCalculator(
            self._graph, self._requirements, self._demonstrated
        )
        self._generator = RoadmapGenerator(
            self._graph, self._requirements, self._demonstrated
        )

    def calculate_score(self) -> int:
        return self._calculator.readiness_score()

    def identify_gaps(self) -> list[Gap]:
        return self._calculator.identify_gaps()

    def recommend_topics(self) -> list[str]:
        """
        What to start on right now: unmet skills whose own prerequisites are
        already satisfied, worst gap first.

        Deliberately excludes blocked skills even when they score highest.
        Recommending something a student cannot begin is how a roadmap loses
        their trust.
        """
        gaps = self.identify_gaps()
        startable = [g for g in gaps if not g.blocked_by]

        if not startable:
            # Everything the role names is blocked, so the real starting point
            # is the unblocked prerequisites underneath.
            subset = self._graph.closure([r.skill for r in self._requirements])
            layers = self._graph.topological_layers(subset)
            first = layers[0] if layers else []
            return [
                self._graph.name_of(s)
                for s in first
                if self._demonstrated.get(s, 0) == 0
            ][:TOPIC_LIMIT]

        return [g.name for g in startable[:TOPIC_LIMIT]]

    def analyze(self) -> AnalysisResponse:
        warnings = self._graph.validate()
        gaps = self.identify_gaps()
        mastered, in_progress = self._calculator.counts()

        return AnalysisResponse(
            readiness_score=self.calculate_score(),
            mastered=mastered,
            in_progress=in_progress,
            gaps=gaps,
            recommended_topics=self.recommend_topics(),
            roadmap=self._generator.generate(gaps),
            warnings=warnings,
        )


def _phase_title(subcategories: list[str]) -> str:
    """
    Named after what the phase is about, not its number. Mirrors titleFor() in
    skill-service so a locally-layered roadmap and an analyzed one read alike.
    """
    counts = Counter(s for s in subcategories if s)
    if not counts:
        return "Foundations"
    return " and ".join(name for name, _ in counts.most_common(2))


def plan(request: PlanRequest) -> PlanResponse:
    """
    skill-service's contract: it sends its own SkillRow list and expects phases
    it can persist directly. Ordering is still the topological sort — this only
    translates shapes.
    """
    slug_of = {s.id: s.slug for s in request.skills}
    subcategory_of = {s.slug: s.subcategory for s in request.skills}

    analysis = SkillAnalyzer(
        AnalysisRequest(
            skills=[
                Skill(
                    slug=s.slug,
                    name=s.name,
                    subcategory=s.subcategory,
                    category=s.category,
                )
                for s in request.skills
            ],
            edges=[
                Edge(skill=s.slug, prerequisite=slug_of[p])
                for s in request.skills
                for p in s.prerequisites
                if p in slug_of
            ],
            requirements=[
                Requirement(
                    skill=s.slug, required_level=s.required_level, weight=s.weight
                )
                for s in request.skills
            ],
            demonstrated={s.slug: s.level for s in request.skills if s.level > 0},
        )
    ).analyze()

    gap_by_slug = {g.skill: g for g in analysis.gaps}

    phases: list[PlanPhase] = []
    for p in analysis.roadmap.phases:
        ranked = sorted(
            p.skills,
            key=lambda slug: -(gap_by_slug[slug].score if slug in gap_by_slug else 0),
        )
        phases.append(
            PlanPhase(
                phase=p.phase,
                title=_phase_title([subcategory_of.get(s, "") for s in ranked]),
                estimatedWeeks=p.estimated_weeks,
                skills=[
                    PlanSkill(
                        slug=slug,
                        ordinal=i,
                        gapScore=(
                            gap_by_slug[slug].score if slug in gap_by_slug else 0
                        ),
                    )
                    for i, slug in enumerate(ranked)
                ],
            )
        )

    return PlanResponse(phases=phases, readinessScore=analysis.readiness_score)


def compare_roles(request: ComparisonRequest) -> ComparisonResponse:
    """
    Score a student against several roles at once, best fit first.

    Deterministic on purpose: the numbers a recommendation is argued from are
    computed here, and the model is only ever handed the result to narrate.
    """
    results: list[RoleComparison] = []

    for role in request.roles:
        analysis = SkillAnalyzer(
            AnalysisRequest(
                skills=request.skills,
                edges=request.edges,
                requirements=role.requirements,
                demonstrated=request.demonstrated,
            )
        ).analyze()

        first = analysis.roadmap.phases[0].names if analysis.roadmap.phases else []

        results.append(
            RoleComparison(
                slug=role.slug,
                name=role.name,
                readiness_score=analysis.readiness_score,
                mastered=analysis.mastered,
                in_progress=analysis.in_progress,
                requirements=len(role.requirements),
                skills_remaining=analysis.roadmap.to_learn,
                total_weeks=analysis.roadmap.total_weeks,
                first_phase=first,
            )
        )

    results.sort(key=lambda r: (-r.readiness_score, r.skills_remaining))
    return ComparisonResponse(roles=results)
