from models.schemas import (
    FeedbackItem,
    GradingConfig,
    GradingResult,
    GradingRequest,
    HumanReviewedGrade,
    LLMProvider,
    ProposedGrade,
    RubricAnalysis,
    RubricCriterion,
    StandardAnalysis,
)


def test_grading_config_and_provider_defaults():
    config = GradingConfig(llm_provider=LLMProvider.CLAUDE, api_key="secret")

    assert config.llm_provider == LLMProvider.CLAUDE
    assert config.api_key == "secret"
    assert config.model_name is None


def test_rubric_models_round_trip():
    criterion = RubricCriterion(
        name="Clarity",
        description="Readable implementation",
        max_points=5.0,
        weight=0.5,
    )
    analysis = RubricAnalysis(
        criteria=[criterion],
        total_points=5.0,
        grading_guidelines="Reward clarity and concise code.",
    )

    assert analysis.criteria[0].name == "Clarity"
    assert analysis.model_dump()["total_points"] == 5.0


def test_standard_and_grade_models():
    standard = StandardAnalysis(
        criterion_name="Clarity",
        excellent_characteristics=["Clean structure"],
        key_elements=["Short functions"],
    )
    proposed = ProposedGrade(
        criterion_name="Clarity",
        score=4.0,
        max_points=5.0,
        reasoning="Mostly readable.",
        evidence=["Uses helper functions"],
        suggestions=["Reduce duplication"],
    )
    reviewed = HumanReviewedGrade(
        criterion_name="Clarity",
        score=4.5,
        max_points=5.0,
        reasoning="TA agreed with the proposed direction.",
    )
    feedback = FeedbackItem(
        criterion_name="Clarity",
        strengths=["Readable control flow"],
        areas_for_improvement=["Add comments to complex branches"],
        specific_suggestions=["Explain the validation branch"],
    )

    result = GradingResult(
        student_name="Ada",
        total_score=4.5,
        max_total_score=5.0,
        percentage=90.0,
        grades=[reviewed],
        feedback=[feedback],
        overall_comments="Strong submission.",
    )

    assert standard.criterion_name == "Clarity"
    assert proposed.max_points == 5.0
    assert reviewed.ta_notes is None
    assert result.student_name == "Ada"


def test_grading_request_requires_expected_fields():
    request = GradingRequest(
        config=GradingConfig(llm_provider=LLMProvider.OPENAI, api_key="key"),
        rubric_content="rubric",
        rubric_filename="rubric.txt",
        golden_content=None,
        golden_filename=None,
        student_content="student",
        student_filename="student.txt",
    )

    assert request.rubric_filename == "rubric.txt"
    assert request.student_filename == "student.txt"
