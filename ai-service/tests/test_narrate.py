import pytest
from fastapi import HTTPException

from main import NarratePhase, NarrateRequest, json_payload, narration_payload, plan_summary

PHASES = [
    NarratePhase.model_validate(
        {"phase": 1, "title": "Programming Languages", "estimatedWeeks": 4,
         "skills": ["Algorithms", "Object-Oriented Programming"]}
    ),
    NarratePhase.model_validate(
        {"phase": 2, "title": "Machine Learning", "estimatedWeeks": 6,
         "skills": ["Supervised Learning"]}
    ),
]


def request(**overrides) -> NarrateRequest:
    return NarrateRequest(
        role="AI Engineer", readiness=44, phases=PHASES, **overrides
    )


def test_the_plan_reaches_the_prompt_in_the_order_it_was_computed():
    summary = plan_summary(request())
    assert summary.index("Phase 1") < summary.index("Phase 2")
    assert "Algorithms, Object-Oriented Programming" in summary
    assert "about 4 weeks" in summary
    assert "Readiness against it: 44%" in summary


def test_strengths_are_offered_and_omitted_when_absent():
    assert "Already demonstrated: Python" in plan_summary(request(strengths=["Python"]))
    assert "Already demonstrated" not in plan_summary(request())


def test_a_phase_without_an_estimate_states_no_number():
    summary = plan_summary(
        NarrateRequest(role="AI Engineer", phases=[NarratePhase(phase=1, title="Git")])
    )
    assert "weeks" not in summary
    assert "Readiness" not in summary


def test_fenced_json_still_parses():
    payload = json_payload({"content": '```json\n{"narration":"go"}\n```'})
    assert payload == {"narration": "go"}


def test_prose_instead_of_json_is_a_bad_gateway():
    with pytest.raises(HTTPException) as raised:
        json_payload({"content": "Here is your roadmap!"})
    assert raised.value.status_code == 502


def test_rationales_are_kept_per_phase():
    payload = narration_payload(
        {
            "narration": "  Start with the language work.  ",
            "rationales": [
                {"phase": 1, "rationale": " Nothing blocks these. "},
                {"phase": 2, "rationale": "Needs the language work first."},
            ],
        },
        PHASES,
    )
    assert payload["narration"] == "Start with the language work."
    assert payload["rationales"][0] == {"phase": 1, "rationale": "Nothing blocks these."}
    assert len(payload["rationales"]) == 2


def test_a_phase_the_model_invented_is_dropped():
    payload = narration_payload(
        {"rationales": [{"phase": 9, "rationale": "The phase I made up."}]}, PHASES
    )
    assert payload["rationales"] == []


def test_junk_rationales_are_dropped_without_failing_the_request():
    payload = narration_payload(
        {
            "narration": None,
            "rationales": [
                "not an object",
                {"phase": "two", "rationale": "unparseable number"},
                {"phase": 1, "rationale": ""},
                {"rationale": "no phase at all"},
                {"phase": "2", "rationale": "a number as a string is still a number"},
            ],
        },
        PHASES,
    )
    assert payload["narration"] == ""
    assert payload["rationales"] == [
        {"phase": 2, "rationale": "a number as a string is still a number"}
    ]
