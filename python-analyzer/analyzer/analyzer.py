from __future__ import annotations

from .gaps import SkillGapCalculator
from .graph import SkillGraph
from .models import AnalysisRequest, AnalysisResponse, Gap
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
