from analyzer.analyzer import SkillAnalyzer, compare_roles, plan
from analyzer.gaps import SkillGapCalculator
from analyzer.graph import SkillGraph
from analyzer.models import (
    AnalysisRequest,
    ComparisonRequest,
    Edge,
    Requirement,
    PlanRequest,
    RoleRequirements,
    ServiceSkill,
    Skill,
)
from analyzer.roadmap import RoadmapGenerator


def skills(*slugs: str) -> list[Skill]:
    return [Skill(slug=s, name=s.replace("-", " ").title()) for s in slugs]


def chain() -> tuple[list[Skill], list[Edge]]:
    """a -> b -> c, plus an independent d."""
    return (
        skills("a", "b", "c", "d"),
        [Edge(skill="b", prerequisite="a"), Edge(skill="c", prerequisite="b")],
    )


class TestSkillGraph:
    def test_closure_pulls_in_transitive_prerequisites(self):
        s, e = chain()
        assert SkillGraph(s, e).closure(["c"]) == {"a", "b", "c"}

    def test_closure_of_independent_skill_is_itself(self):
        s, e = chain()
        assert SkillGraph(s, e).closure(["d"]) == {"d"}

    def test_layers_follow_prerequisite_depth(self):
        s, e = chain()
        layers = SkillGraph(s, e).topological_layers({"a", "b", "c"})
        assert layers == [["a"], ["b"], ["c"]]

    def test_independent_skills_share_a_layer(self):
        s, e = chain()
        layers = SkillGraph(s, e).topological_layers({"a", "d"})
        assert layers == [["a", "d"]]

    def test_layer_is_one_past_deepest_prerequisite(self):
        # c depends on both b (depth 1) and d (depth 0) -> c lands at depth 2
        s = skills("a", "b", "c", "d")
        e = [
            Edge(skill="b", prerequisite="a"),
            Edge(skill="c", prerequisite="b"),
            Edge(skill="c", prerequisite="d"),
        ]
        layers = SkillGraph(s, e).topological_layers({"a", "b", "c", "d"})
        assert layers == [["a", "d"], ["b"], ["c"]]

    def test_validate_accepts_a_dag(self):
        s, e = chain()
        assert SkillGraph(s, e).validate() == []

    def test_validate_reports_a_cycle(self):
        s = skills("a", "b")
        e = [Edge(skill="a", prerequisite="b"), Edge(skill="b", prerequisite="a")]
        problems = SkillGraph(s, e).validate()
        assert any("cycle" in p for p in problems)

    def test_validate_reports_dangling_edge(self):
        s = skills("a")
        e = [Edge(skill="a", prerequisite="ghost")]
        problems = SkillGraph(s, e).validate()
        assert any("ghost" in p for p in problems)

    def test_layering_terminates_on_a_cycle(self):
        s = skills("a", "b")
        e = [Edge(skill="a", prerequisite="b"), Edge(skill="b", prerequisite="a")]
        # Must not hang. Correctness of the output is meaningless here;
        # validate() is what callers are expected to check.
        assert SkillGraph(s, e).topological_layers({"a", "b"}) != []


class TestSkillGapCalculator:
    def _calc(self, demonstrated):
        s, e = chain()
        reqs = [
            Requirement(skill="a", required_level=3, weight=5),
            Requirement(skill="b", required_level=2, weight=1),
        ]
        return SkillGapCalculator(SkillGraph(s, e), reqs, demonstrated)

    def test_no_gaps_when_fully_met(self):
        assert self._calc({"a": 3, "b": 2}).identify_gaps() == []

    def test_score_is_100_when_fully_met(self):
        assert self._calc({"a": 3, "b": 2}).readiness_score() == 100

    def test_score_is_0_when_nothing_demonstrated(self):
        assert self._calc({}).readiness_score() == 0

    def test_weight_decides_gap_order(self):
        # Equal deficit of 1, but a is weight 5 and b is weight 1.
        gaps = self._calc({"a": 2, "b": 1}).identify_gaps()
        assert [g.skill for g in gaps] == ["a", "b"]

    def test_score_caps_credit_at_required_level(self):
        # Exceeding one requirement must not compensate for missing another.
        over = self._calc({"a": 5, "b": 0}).readiness_score()
        exact = self._calc({"a": 3, "b": 0}).readiness_score()
        assert over == exact

    def test_blocked_by_lists_unmet_prerequisites(self):
        gaps = self._calc({}).identify_gaps()
        b = next(g for g in gaps if g.skill == "b")
        assert b.blocked_by == ["a"]

    def test_met_prerequisite_does_not_block(self):
        gaps = self._calc({"a": 3}).identify_gaps()
        b = next(g for g in gaps if g.skill == "b")
        assert b.blocked_by == []

    def test_barely_started_prerequisite_still_blocks(self):
        # a is required at 3, so a foundation is 2. At 1 it is evidence of
        # having looked at a, not of being ready for what depends on it.
        gaps = self._calc({"a": 1}).identify_gaps()
        b = next(g for g in gaps if g.skill == "b")
        assert b.blocked_by == ["a"]

    def test_half_the_required_level_is_enough_to_unblock(self):
        # Waiting for the full level would hold back skills a student can
        # already begin. This boundary is mirrored in packages/db.
        gaps = self._calc({"a": 2}).identify_gaps()
        b = next(g for g in gaps if g.skill == "b")
        assert b.blocked_by == []

    def test_counts_split_mastered_and_in_progress(self):
        mastered, in_progress = self._calc({"a": 3, "b": 1}).counts()
        assert (mastered, in_progress) == (1, 1)


class TestRoadmapGenerator:
    def test_phases_respect_prerequisite_order(self):
        s, e = chain()
        graph = SkillGraph(s, e)
        reqs = [Requirement(skill="c", required_level=3, weight=3)]
        gaps = SkillGapCalculator(graph, reqs, {}).identify_gaps()
        roadmap = RoadmapGenerator(graph, reqs, {}).generate(gaps)

        assert [p.skills for p in roadmap.phases] == [["a"], ["b"], ["c"]]

    def test_demonstrated_skills_drop_out_of_the_plan(self):
        s, e = chain()
        graph = SkillGraph(s, e)
        reqs = [Requirement(skill="c", required_level=3, weight=3)]
        roadmap = RoadmapGenerator(graph, reqs, {"a": 5, "b": 5}).generate([])

        assert roadmap.to_learn == 1
        assert [p.skills for p in roadmap.phases] == [["c"]]

    def test_every_phase_takes_at_least_a_week(self):
        s, e = chain()
        graph = SkillGraph(s, e)
        reqs = [Requirement(skill="c", required_level=2, weight=1)]
        gaps = SkillGapCalculator(graph, reqs, {}).identify_gaps()
        roadmap = RoadmapGenerator(graph, reqs, {}).generate(gaps)

        assert all(p.estimated_weeks >= 1 for p in roadmap.phases)

    def test_unlocks_counts_dependents_still_to_learn(self):
        s, e = chain()
        graph = SkillGraph(s, e)
        reqs = [Requirement(skill="c", required_level=3, weight=3)]
        gaps = SkillGapCalculator(graph, reqs, {}).identify_gaps()
        roadmap = RoadmapGenerator(graph, reqs, {}).generate(gaps)

        assert roadmap.phases[0].unlocks == 1


class TestSkillAnalyzer:
    def _request(self, demonstrated=None):
        s, e = chain()
        return AnalysisRequest(
            skills=s,
            edges=e,
            requirements=[
                Requirement(skill="c", required_level=4, weight=5),
                Requirement(skill="d", required_level=2, weight=2),
            ],
            demonstrated=demonstrated or {},
        )

    def test_recommend_topics_excludes_blocked_skills(self):
        topics = SkillAnalyzer(self._request()).recommend_topics()
        # c is blocked behind a and b, so it cannot be a starting point.
        assert "C" not in topics

    def test_recommend_topics_falls_back_to_root_prerequisites(self):
        # Only requirement is fully blocked, so the roots underneath surface.
        s, e = chain()
        request = AnalysisRequest(
            skills=s,
            edges=e,
            requirements=[Requirement(skill="c", required_level=4, weight=5)],
        )
        assert SkillAnalyzer(request).recommend_topics() == ["A"]

    def test_recommend_topics_prefers_startable_requirement(self):
        topics = SkillAnalyzer(self._request()).recommend_topics()
        assert "D" in topics

    def test_analyze_reports_cycle_as_a_warning(self):
        request = AnalysisRequest(
            skills=skills("a", "b"),
            edges=[
                Edge(skill="a", prerequisite="b"),
                Edge(skill="b", prerequisite="a"),
            ],
            requirements=[Requirement(skill="a", required_level=2, weight=1)],
        )
        assert any("cycle" in w for w in SkillAnalyzer(request).analyze().warnings)

    def test_analyze_is_clean_for_a_valid_graph(self):
        result = SkillAnalyzer(self._request({"d": 1})).analyze()
        assert result.warnings == []
        assert 0 < result.readiness_score < 100

    def test_readiness_counts_requirements_not_prerequisites(self):
        # `a` is a prerequisite of `c`, never a requirement itself. Readiness
        # answers "ready for this role", so progress on scaffolding does not
        # move it. RoadmapGenerator is what credits prerequisite work.
        result = SkillAnalyzer(self._request({"a": 5})).analyze()
        assert result.readiness_score == 0
        assert result.roadmap.to_learn < result.roadmap.with_prerequisites


class TestCompareRoles:
    def _request(self, demonstrated: dict[str, int]) -> ComparisonRequest:
        nodes, edges = chain()
        return ComparisonRequest(
            skills=nodes,
            edges=edges,
            demonstrated=demonstrated,
            roles=[
                RoleRequirements(
                    slug="deep",
                    name="Deep",
                    requirements=[Requirement(skill="c", required_level=3, weight=3)],
                ),
                RoleRequirements(
                    slug="shallow",
                    name="Shallow",
                    requirements=[Requirement(skill="d", required_level=3, weight=3)],
                ),
            ],
        )

    def test_orders_by_readiness_descending(self):
        result = compare_roles(self._request({"d": 3}))
        assert [r.slug for r in result.roles] == ["shallow", "deep"]
        assert result.roles[0].readiness_score == 100
        assert result.roles[1].readiness_score == 0

    def test_scores_every_role_supplied(self):
        result = compare_roles(self._request({}))
        assert len(result.roles) == 2
        assert all(r.readiness_score == 0 for r in result.roles)

    def test_ties_break_toward_the_shorter_path(self):
        # Neither role is started, so both score 0. `d` stands alone while `c`
        # drags a and b behind it, so Shallow must come first.
        result = compare_roles(self._request({}))
        assert result.roles[0].slug == "shallow"
        assert result.roles[0].skills_remaining < result.roles[1].skills_remaining

    def test_first_phase_lists_only_startable_skills(self):
        result = compare_roles(self._request({}))
        deep = next(r for r in result.roles if r.slug == "deep")
        assert deep.first_phase == ["A"]


class TestPlan:
    def _request(self, demonstrated: dict[str, int]) -> PlanRequest:
        # skill-service sends ids in `prerequisites`, not slugs.
        ids = {"a": "id-a", "b": "id-b", "c": "id-c", "d": "id-d"}
        prereqs = {"b": ["id-a"], "c": ["id-b"]}
        return PlanRequest(
            role={"slug": "deep", "name": "Deep"},
            skills=[
                ServiceSkill(
                    id=ids[slug],
                    slug=slug,
                    name=slug.upper(),
                    subcategory="Core" if slug in ("a", "b") else "Applied",
                    level=demonstrated.get(slug, 0),
                    requiredLevel=3,
                    weight=3,
                    prerequisites=prereqs.get(slug, []),
                )
                for slug in ids
            ],
        )

    def test_resolves_prerequisite_ids_into_ordering(self):
        result = plan(self._request({}))
        order = [p.skills[0].slug for p in result.phases]
        assert order.index("a") < order.index("b") < order.index("c")

    def test_response_uses_skill_services_camelcase_contract(self):
        phase = plan(self._request({})).phases[0]
        dumped = phase.model_dump()
        assert "estimatedWeeks" in dumped
        assert "gapScore" in dumped["skills"][0]

    def test_phases_are_numbered_from_one_and_titled(self):
        result = plan(self._request({}))
        assert result.phases[0].phase == 1
        assert all(p.title for p in result.phases)

    def test_demonstrated_levels_are_read_off_the_rows(self):
        # level lives on each row rather than a separate demonstrated map.
        full = plan(self._request({}))
        partial = plan(self._request({"a": 3}))
        assert partial.readinessScore > full.readinessScore
