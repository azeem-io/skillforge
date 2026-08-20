from __future__ import annotations

from collections import defaultdict

from .models import Edge, Skill


class SkillGraph:
    """The prerequisite DAG. Adjacency, reachability and layering."""

    def __init__(self, skills: list[Skill], edges: list[Edge]) -> None:
        self._skills = {s.slug: s for s in skills}
        self._edges = edges
        self._prereqs: dict[str, list[str]] = defaultdict(list)
        self._dependents: dict[str, list[str]] = defaultdict(list)

        for e in edges:
            self._prereqs[e.skill].append(e.prerequisite)
            self._dependents[e.prerequisite].append(e.skill)

    def __contains__(self, slug: str) -> bool:
        return slug in self._skills

    def name_of(self, slug: str) -> str:
        skill = self._skills.get(slug)
        return skill.name if skill else slug

    def prerequisites_of(self, slug: str) -> list[str]:
        return list(self._prereqs.get(slug, []))

    def dependents_of(self, slug: str) -> list[str]:
        return list(self._dependents.get(slug, []))

    def validate(self) -> list[str]:
        """Dangling references and cycles. SQL can express neither."""
        problems: list[str] = []

        for e in self._edges:
            if e.skill not in self._skills:
                problems.append(f"edge references unknown skill: {e.skill}")
            if e.prerequisite not in self._skills:
                problems.append(
                    f"edge references unknown prerequisite: {e.prerequisite}"
                )

        WHITE, GREY, BLACK = 0, 1, 2
        colour: dict[str, int] = {s: WHITE for s in self._skills}
        stack: list[str] = []

        def walk(node: str) -> None:
            colour[node] = GREY
            stack.append(node)
            for p in self._prereqs.get(node, []):
                if p not in colour:
                    continue
                if colour[p] == GREY:
                    cycle = stack[stack.index(p) :] + [p]
                    problems.append("cycle: " + " -> ".join(cycle))
                elif colour[p] == WHITE:
                    walk(p)
            stack.pop()
            colour[node] = BLACK

        for slug in self._skills:
            if colour[slug] == WHITE:
                walk(slug)

        return problems

    def closure(self, roots: list[str]) -> set[str]:
        """`roots` plus every prerequisite reachable from them."""
        seen: set[str] = set()

        def walk(node: str) -> None:
            if node in seen or node not in self._skills:
                return
            seen.add(node)
            for p in self._prereqs.get(node, []):
                walk(p)

        for r in roots:
            walk(r)
        return seen

    def topological_layers(self, subset: set[str]) -> list[list[str]]:
        """
        Longest-path layering restricted to `subset`. A node's layer is one past
        its deepest prerequisite, so everything sharing a layer can be learned in
        parallel — which is what makes a layer a usable roadmap phase.

        Assumes acyclic; call validate() first. A cycle would recurse forever,
        so the guard below returns 0 rather than hanging.
        """
        depth: dict[str, int] = {}
        visiting: set[str] = set()

        def rank(node: str) -> int:
            if node in depth:
                return depth[node]
            if node in visiting:
                return 0
            visiting.add(node)
            parents = [p for p in self._prereqs.get(node, []) if p in subset]
            depth[node] = max((rank(p) for p in parents), default=-1) + 1
            visiting.discard(node)
            return depth[node]

        for node in subset:
            rank(node)

        layers: dict[int, list[str]] = defaultdict(list)
        for node in subset:
            layers[depth[node]].append(node)

        return [sorted(layers[i]) for i in sorted(layers)]
