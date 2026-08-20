from __future__ import annotations

from .graph import SkillGraph
from .models import Gap, Phase, Roadmap, Requirement

# A single level-step of progress, in study hours. Multiplied by the deficit.
HOURS_PER_LEVEL = 9
HOURS_PER_WEEK = 8


class RoadmapGenerator:
    """
    Turns a set of gaps into an ordered plan.

    The ordering is a topological layering of the prerequisite graph, not a
    ranking by importance — you cannot study a skill before the thing it
    depends on, however badly you need it. Importance decides the order
    *within* a phase.
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

    def _to_learn(self) -> set[str]:
        targets = [r.skill for r in self._requirements]
        closure = self._graph.closure(targets)
        required_level = {r.skill: r.required_level for r in self._requirements}

        return {
            slug
            for slug in closure
            if self._demonstrated.get(slug, 0) < required_level.get(slug, 1)
        }

    def estimate_effort(self, slugs: list[str], gaps: dict[str, Gap]) -> int:
        """
        Weeks for one phase. Skills in a phase are independent, so this is the
        longest single skill rather than the sum — they can be interleaved.
        """
        hours = [
            max(gaps[s].deficit, 1) * HOURS_PER_LEVEL if s in gaps else HOURS_PER_LEVEL
            for s in slugs
        ]
        longest = max(hours, default=0)
        total = sum(hours)
        # Somewhere between "all at once" and "strictly one after another".
        blended = (longest + total) / 2
        return max(1, round(blended / HOURS_PER_WEEK))

    def generate(self, gaps: list[Gap]) -> Roadmap:
        subset = self._to_learn()
        layers = self._graph.topological_layers(subset)
        by_slug = {g.skill: g for g in gaps}

        phases: list[Phase] = []
        for i, layer in enumerate(layers, start=1):
            ordered = sorted(
                layer,
                key=lambda s: (-(by_slug[s].score if s in by_slug else 0), s),
            )
            unlocks = len(
                {
                    d
                    for s in layer
                    for d in self._graph.dependents_of(s)
                    if d in subset
                }
            )
            phases.append(
                Phase(
                    phase=i,
                    skills=ordered,
                    names=[self._graph.name_of(s) for s in ordered],
                    estimated_weeks=self.estimate_effort(ordered, by_slug),
                    unlocks=unlocks,
                )
            )

        return Roadmap(
            target_skills=len(self._requirements),
            with_prerequisites=len(
                self._graph.closure([r.skill for r in self._requirements])
            ),
            to_learn=len(subset),
            total_weeks=sum(p.estimated_weeks for p in phases),
            phases=phases,
        )
