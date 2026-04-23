from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import asyncio
import httpx
import pytest

from main import app, workflow_states
from models.schemas import GradingConfig, HumanReviewedGrade, LLMProvider, RubricAnalysis, RubricCriterion


transport = httpx.ASGITransport(app=app)


def _request(method: str, url: str, **kwargs):
    async def _run_request():
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.request(method, url, **kwargs)

    return asyncio.run(_run_request())


class FakeUUID:
    def __str__(self):
        return "workflow-123"


def _request_payload():
    return {
        "llm_provider": "claude",
        "api_key": "test-key",
        "model_name": None,
        "rubric_file": "rubric text",
        "rubric_filename": "rubric.txt",
        "golden_file": "golden text",
        "golden_filename": "golden.txt",
        "student_file": "student text",
        "student_filename": "student.txt",
    }


def _workflow_result(sample_proposed_grades):
    return {
        "config": GradingConfig(llm_provider=LLMProvider.CLAUDE, api_key="test-key"),
        "rubric_content": "rubric text",
        "rubric_analysis": None,
        "golden_content": "golden text",
        "standard_analysis": None,
        "student_content": "student text",
        "proposed_grades": sample_proposed_grades,
        "reviewed_grades": None,
        "feedback": None,
        "overall_comments": None,
        "error": None,
        "current_step": "awaiting_human_review",
    }


def test_root_and_health_endpoints():
    root_response = _request("GET", "/")
    health_response = _request("GET", "/health")

    assert root_response.status_code == 200
    assert root_response.json()["status"] == "running"
    assert health_response.status_code == 200
    assert health_response.json()["status"] == "healthy"


def test_initiate_grading_success(sample_proposed_grades):
    workflow_result = _workflow_result(sample_proposed_grades)

    with patch("main.FileProcessor.process_file", side_effect=["rubric text", "golden text", "student text"]), patch(
        "main.GradingWorkflow.run_until_human_review", new=AsyncMock(return_value=workflow_result)
    ), patch("uuid.uuid4", return_value=FakeUUID()):
        response = _request("POST", "/api/grading/initiate", json=_request_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["workflow_id"] == "workflow-123"
    assert body["status"] == "awaiting_review"
    assert len(body["proposed_grades"]) == 2
    assert workflow_states["workflow-123"]["current_step"] == "awaiting_human_review"


def test_initiate_grading_returns_500_on_workflow_error():
    with patch("main.FileProcessor.process_file", side_effect=["rubric text", "golden text", "student text"]), patch(
        "main.GradingWorkflow.run_until_human_review", new=AsyncMock(return_value={"error": "workflow failed"})
    ):
        response = _request("POST", "/api/grading/initiate", json=_request_payload())

    assert response.status_code == 500
    assert "workflow failed" in response.json()["detail"]


def test_review_grades_success(sample_reviewed_grades, sample_feedback_items):
    workflow_states["workflow-123"] = {
        "config": GradingConfig(llm_provider=LLMProvider.CLAUDE, api_key="test-key"),
        "rubric_content": "rubric text",
        "rubric_analysis": RubricAnalysis(
            criteria=[RubricCriterion(name="Code Quality", description="desc", max_points=10.0)],
            total_points=10.0,
            grading_guidelines="guidelines",
        ),
        "golden_content": "golden text",
        "standard_analysis": None,
        "student_content": "student text",
        "proposed_grades": [],
        "reviewed_grades": None,
        "feedback": None,
        "overall_comments": None,
        "error": None,
        "current_step": "awaiting_human_review",
    }

    final_state = {
        **workflow_states["workflow-123"],
        "reviewed_grades": sample_reviewed_grades,
        "feedback": sample_feedback_items,
        "overall_comments": "Well done overall.",
        "current_step": "feedback_generated",
    }

    with patch("main.GradingWorkflow.run_after_human_review", new=AsyncMock(return_value=final_state)):
        response = _request(
            "POST",
            "/api/grading/review",
            json={
                "workflow_id": "workflow-123",
                "reviewed_grades": [grade.model_dump() for grade in sample_reviewed_grades],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total_score"] == 13.0
    assert body["max_total_score"] == 15.0
    assert body["percentage"] == pytest.approx(86.66666666666667)
    assert body["overall_comments"] == "Well done overall."
    assert "workflow-123" not in workflow_states


def test_review_grades_returns_404_for_unknown_workflow():
    response = _request(
        "POST",
        "/api/grading/review",
        json={
            "workflow_id": "missing",
            "reviewed_grades": [],
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workflow not found"
