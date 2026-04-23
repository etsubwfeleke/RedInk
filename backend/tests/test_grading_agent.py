import asyncio
import json
from unittest.mock import AsyncMock, patch

from agents.grading_agent import GradingAgent


def _grading_llm_response():
    return json.dumps(
        {
            "proposed_grades": [
                {
                    "criterion_name": "Code Quality",
                    "score": 8.5,
                    "max_points": 10.0,
                    "reasoning": "Strong structure with minor refactoring opportunities.",
                    "evidence": ["Used helper functions", "Consistent naming"],
                    "suggestions": ["Split the large service into smaller units"],
                },
                {
                    "criterion_name": "Documentation",
                    "score": 3.5,
                    "max_points": 5.0,
                    "reasoning": "Some comments are present, but docstrings are incomplete.",
                    "evidence": ["Comments in main logic"],
                    "suggestions": ["Add docstrings to exported functions"],
                },
            ]
        }
    )


def test_grading_agent_success_with_standards(sample_config_claude, sample_rubric_analysis, sample_student_text, sample_standard_analysis):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "student_content": sample_student_text,
        "standard_analysis": sample_standard_analysis,
    }

    with patch("agents.grading_agent.LLMService.call_llm", new=AsyncMock(return_value=_grading_llm_response())):
        result = asyncio.run(GradingAgent.grade(state))

    assert result["current_step"] == "grades_proposed"
    assert len(result["proposed_grades"]) == 2
    assert result["proposed_grades"][0].score == 8.5


def test_grading_agent_success_without_standards(sample_config_claude, sample_rubric_analysis, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "student_content": sample_student_text,
        "standard_analysis": None,
    }

    with patch("agents.grading_agent.LLMService.call_llm", new=AsyncMock(return_value=_grading_llm_response())) as mock_llm:
        result = asyncio.run(GradingAgent.grade(state))

    assert result["current_step"] == "grades_proposed"
    assert mock_llm.await_count == 1
    assert len(result["proposed_grades"]) == 2


def test_grading_agent_handles_invalid_json(sample_config_claude, sample_rubric_analysis, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "student_content": sample_student_text,
    }

    with patch("agents.grading_agent.LLMService.call_llm", new=AsyncMock(return_value="broken json")):
        result = asyncio.run(GradingAgent.grade(state))

    assert result["current_step"] == "error"
    assert "Grading failed" in result["error"]


def test_grading_agent_handles_llm_failure(sample_config_claude, sample_rubric_analysis, sample_student_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "student_content": sample_student_text,
    }

    with patch("agents.grading_agent.LLMService.call_llm", new=AsyncMock(side_effect=RuntimeError("llm down"))):
        result = asyncio.run(GradingAgent.grade(state))

    assert result["current_step"] == "error"
    assert "llm down" in result["error"]
