from __future__ import annotations

from .graph import SkillGraph
from .models import Gap, Requirement


class SkillGapCalculator:
    """
    Compares demonstrated proficiency against what a role requires.

    The weighting is the point. An unweighted gap list ranks a nice-to-have
    equally with a core requirement, and a roadmap built on that has no reason
    to put anything before anything else.
    """

    def __init__(
        self,
        graph: SkillGraph,
        requirements: list[Requirement],
        demonstrated: dict[str, int],
    ) -> None:
        self._graph = graph
        self._requirements = requirements
        self._demonstrated = demonstrated

    def level_of(self, slug: str) -> int:
        return self._demonstrated.get(slug, 0)

    def identify_gaps(self) -> list[Gap]:
        """Every requirement not yet met, worst first."""
        gaps: list[Gap] = []

        met = {
            r.skill
            for r in self._requirements
            if self.level_of(r.skill) >= r.required_level
        }

        for req in self._requirements:
            current = self.level_of(req.skill)
            deficit = req.required_level - current
            if deficit <= 0:
                continue

            blocked_by = [
                p
                for p in self._graph.prerequisites_of(req.skill)
                if p not in met and self.level_of(p) == 0
            ]

            gaps.append(
                Gap(
                    skill=req.skill,
                    name=self._graph.name_of(req.skill),
                    current_level=current,
                    required_level=req.required_level,
                    weight=req.weight,
                    deficit=deficit,
                    score=deficit * req.weight,
                    blocked_by=sorted(blocked_by),
                )
            )

        return sorted(gaps, key=lambda g: (-g.score, g.name))

    def readiness_score(self) -> int:
        """
        Weighted percentage of the role already covered. Credit is capped at the
        required level so over-qualification in one area cannot paper over a gap
        in another.
        """
        earned = sum(
            min(self.level_of(r.skill), r.required_level) * r.weight
            for r in self._requirements
        )
        total = sum(r.required_level * r.weight for r in self._requirements)
        return round(earned / total * 100) if total else 0

    def counts(self) -> tuple[int, int]:
        mastered = sum(
            1
            for r in self._requirements
            if self.level_of(r.skill) >= r.required_level
        )
        in_progress = sum(
            1
            for r in self._requirements
            if 0 < self.level_of(r.skill) < r.required_level
        )
        return mastered, in_progress
