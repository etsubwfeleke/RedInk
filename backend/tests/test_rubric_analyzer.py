import asyncio
import json
from unittest.mock import AsyncMock, patch

from agents.rubric_analyzer import RubricAnalyzerAgent


def _rubric_llm_response():
    return "```json\n" + json.dumps(
        {
            "criteria": [
                {
                    "name": "Code Quality",
                    "description": "Clean, well-structured code",
                    "max_points": 10.0,
                    "weight": 1.0,
                },
                {
                    "name": "Documentation",
                    "description": "Clear comments and docstrings",
                    "max_points": 5.0,
                    "weight": 1.0,
                },
            ],
            "total_points": 15.0,
            "grading_guidelines": "Reward clarity and structure.",
        }
    ) + "\n```"


def test_rubric_analyzer_success(sample_config_claude, sample_rubric_text):
    state = {"config": sample_config_claude, "rubric_content": sample_rubric_text}

    with patch("agents.rubric_analyzer.LLMService.call_llm", new=AsyncMock(return_value=_rubric_llm_response())):
        result = asyncio.run(RubricAnalyzerAgent.analyze(state))

    assert result["current_step"] == "rubric_analyzed"
    assert "error" not in result
    assert result["rubric_analysis"].total_points == 15.0
    assert len(result["rubric_analysis"].criteria) == 2
    assert result["rubric_analysis"].criteria[0].name == "Code Quality"


def test_rubric_analyzer_handles_malformed_json(sample_config_claude, sample_rubric_text):
    state = {"config": sample_config_claude, "rubric_content": sample_rubric_text}

    with patch("agents.rubric_analyzer.LLMService.call_llm", new=AsyncMock(return_value="not json")):
        result = asyncio.run(RubricAnalyzerAgent.analyze(state))

    assert result["current_step"] == "error"
    assert "Rubric analysis failed" in result["error"]


def test_rubric_analyzer_handles_llm_failure(sample_config_claude, sample_rubric_text):
    state = {"config": sample_config_claude, "rubric_content": sample_rubric_text}

    with patch("agents.rubric_analyzer.LLMService.call_llm", new=AsyncMock(side_effect=RuntimeError("boom"))):
        result = asyncio.run(RubricAnalyzerAgent.analyze(state))

    assert result["current_step"] == "error"
    assert "boom" in result["error"]
