import asyncio
import json
from unittest.mock import AsyncMock, patch

from agents.standard_setter import StandardSetterAgent


def _standard_llm_response():
    return "```json\n" + json.dumps(
        {
            "standards": [
                {
                    "criterion_name": "Code Quality",
                    "excellent_characteristics": ["Modular", "Readable"],
                    "key_elements": ["Helper functions", "No duplication"],
                },
                {
                    "criterion_name": "Documentation",
                    "excellent_characteristics": ["Docstrings for public methods"],
                    "key_elements": ["Comments on complex logic"],
                },
            ]
        }
    ) + "\n```"


def test_standard_setter_skips_when_no_golden_assignment(sample_config_claude, sample_rubric_analysis):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "golden_content": None,
    }

    with patch("agents.standard_setter.LLMService.call_llm") as mock_llm:
        result = asyncio.run(StandardSetterAgent.analyze(state))

    mock_llm.assert_not_called()
    assert result["standard_analysis"] is None
    assert result["current_step"] == "standards_set"


def test_standard_setter_success(sample_config_claude, sample_rubric_analysis, sample_golden_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "golden_content": sample_golden_text,
    }

    with patch("agents.standard_setter.LLMService.call_llm", new=AsyncMock(return_value=_standard_llm_response())):
        result = asyncio.run(StandardSetterAgent.analyze(state))

    assert result["current_step"] == "standards_set"
    assert len(result["standard_analysis"]) == 2
    assert result["standard_analysis"][0].criterion_name == "Code Quality"


def test_standard_setter_handles_bad_json(sample_config_claude, sample_rubric_analysis, sample_golden_text):
    state = {
        "config": sample_config_claude,
        "rubric_analysis": sample_rubric_analysis,
        "golden_content": sample_golden_text,
    }

    with patch("agents.standard_setter.LLMService.call_llm", new=AsyncMock(return_value="broken json")):
        result = asyncio.run(StandardSetterAgent.analyze(state))

    assert result["current_step"] == "error"
    assert "Standard setting failed" in result["error"]
