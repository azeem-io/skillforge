from main import StudentContext, assessment_catalog, student_summary

ATTEMPT = {
    "slug": "python-fundamentals",
    "title": "Python Fundamentals",
    "score": 7,
    "maxScore": 10,
    "completedAt": "2026-08-21T09:31:00.000Z",
    "weakest": [
        {"name": "NumPy", "correct": 1, "total": 3},
        {"name": "Pandas", "correct": 2, "total": 4},
    ],
}


def test_empty_context_adds_nothing():
    assert student_summary(None) == ""
    assert student_summary(StudentContext()) == ""


def test_levels_without_assessments_omit_the_block():
    summary = student_summary(StudentContext(demonstrated={"numpy": 2}))
    assert "numpy (level 2)" in summary
    assert "Assessments they have taken" not in summary


def test_attempt_reaches_the_prompt_with_score_date_and_weakest():
    summary = student_summary(
        StudentContext.model_validate({"recent_assessments": [ATTEMPT]})
    )
    assert "Python Fundamentals" in summary
    assert "scored 7/10" in summary
    assert "on 2026-08-21" in summary
    assert "NumPy 1/3" in summary
    assert "Pandas 2/4" in summary


def test_camel_case_from_the_frontend_is_accepted():
    context = StudentContext.model_validate({"recent_assessments": [ATTEMPT]})
    assert context.recent_assessments[0].max_score == 10
    assert context.recent_assessments[0].completed_at.startswith("2026-08-21")


def test_unfinished_attempt_renders_without_a_score():
    summary = student_summary(
        StudentContext.model_validate(
            {"recent_assessments": [{"slug": "git-fundamentals", "title": "Git"}]}
        )
    )
    assert "- Git\n" in summary
    assert "scored" not in summary


def test_no_catalog_supplied_adds_nothing():
    assert assessment_catalog(None) == ""
    assert assessment_catalog(StudentContext()) == ""


def test_catalog_lists_every_assessment_as_a_link():
    context = StudentContext.model_validate(
        {
            "available_assessments": [
                {"slug": "python-advanced", "title": "Python: Algorithms & Craft"},
                {"slug": "databases-design-operations", "title": "Databases: Design & Operations"},
            ]
        }
    )
    catalog = assessment_catalog(context)
    assert "[Python: Algorithms & Craft](/assessments/python-advanced)" in catalog
    assert (
        "[Databases: Design & Operations](/assessments/databases-design-operations)"
        in catalog
    )


def test_catalog_entry_without_a_title_falls_back_to_the_slug():
    context = StudentContext.model_validate(
        {"available_assessments": [{"slug": "git-fundamentals"}]}
    )
    assert "[git-fundamentals](/assessments/git-fundamentals)" in assessment_catalog(
        context
    )


def test_catalog_entry_without_a_slug_is_skipped():
    context = StudentContext.model_validate(
        {"available_assessments": [{"title": "No slug here"}]}
    )
    assert assessment_catalog(context) == ""
