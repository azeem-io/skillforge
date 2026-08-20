from __future__ import annotations

from .gaps import SkillGapCalculator
from .graph import SkillGraph
from .models import (
    AnalysisRequest,
    AnalysisResponse,
    ComparisonRequest,
    ComparisonResponse,
    Gap,
    RoleComparison,
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
