import asyncio
import json
from unittest.mock import AsyncMock, patch

from agents.feedback_synthesizer import FeedbackSynthesizerAgent


def _feedback_llm_response():
    return json.dumps(
        {
            "feedback_items": [
                {
                    "criterion_name": "Code Quality",
                    "strengths": ["Clear helper boundaries"],
                    "areas_for_improvement": ["Handle invalid input earlier"],
                    "specific_suggestions": ["Add a guard clause for empty data"],
                },
                {
                    "criterion_name": "Documentation",
                    "strengths": ["Some helpful comments"],
                    "areas_for_improvement": ["More docstrings needed"],
                    "specific_suggestions": ["Document public functions and module intent"],
                },
            ],
            "overall_comments": "Solid work with room to expand clarity and documentation.",
        }
    )


def test_feedback_synthesizer_success(sample_config_claude, sample_rubric_analysis, sample_reviewed_grades, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "reviewed_grades": sample_reviewed_grades,
        "student_content": sample_student_text,
    }

    with patch("agents.feedback_synthesizer.LLMService.call_llm", new=AsyncMock(return_value=_feedback_llm_response())):
        result = asyncio.run(FeedbackSynthesizerAgent.synthesize(state))

    assert result["current_step"] == "feedback_generated"
    assert result["overall_comments"].startswith("Solid work")
    assert len(result["feedback"]) == 2
    assert result["feedback"][0].criterion_name == "Code Quality"


def test_feedback_synthesizer_handles_bad_json(sample_config_claude, sample_rubric_analysis, sample_reviewed_grades, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "reviewed_grades": sample_reviewed_grades,
        "student_content": sample_student_text,
    }

    with patch("agents.feedback_synthesizer.LLMService.call_llm", new=AsyncMock(return_value="not json")):
        result = asyncio.run(FeedbackSynthesizerAgent.synthesize(state))

    assert result["current_step"] == "error"
    assert "Feedback synthesis failed" in result["error"]


def test_feedback_synthesizer_handles_llm_failure(sample_config_claude, sample_rubric_analysis, sample_reviewed_grades, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "reviewed_grades": sample_reviewed_grades,
        "student_content": sample_student_text,
    }

    with patch("agents.feedback_synthesizer.LLMService.call_llm", new=AsyncMock(side_effect=RuntimeError("timeout"))):
        result = asyncio.run(FeedbackSynthesizerAgent.synthesize(state))

    assert result["current_step"] == "error"
    assert "timeout" in result["error"]
