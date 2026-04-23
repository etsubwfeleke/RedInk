import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from agents.workflow import GradingWorkflow


def test_await_human_review_marks_checkpoint(sample_workflow_state):
    result = asyncio.run(GradingWorkflow._await_human_review(sample_workflow_state))

    assert result["current_step"] == "awaiting_human_review"
    assert result["rubric_content"] == sample_workflow_state["rubric_content"]


def test_run_until_human_review_delegates_to_compiled_graph(sample_workflow_state):
    workflow = GradingWorkflow()
    fake_result = {**sample_workflow_state, "current_step": "awaiting_human_review"}
    workflow.workflow = SimpleNamespace(ainvoke=AsyncMock(return_value=fake_result))

    result = asyncio.run(workflow.run_until_human_review(sample_workflow_state))

    assert result["current_step"] == "awaiting_human_review"
    workflow.workflow.ainvoke.assert_awaited_once()


def test_full_workflow_runs_nodes_in_order(sample_workflow_state):
    call_order = []

    async def fake_rubric_analyzer(state):
        call_order.append("rubric_analyzer")
        return {**state, "current_step": "rubric_analyzed"}

    async def fake_standard_setter(state):
        call_order.append("standard_setter")
        return {**state, "current_step": "standards_set"}

    async def fake_grading_agent(state):
        call_order.append("grading_agent")
        return {**state, "current_step": "grades_proposed"}

    async def fake_await_review(state):
        call_order.append("await_human_review")
        return {**state, "current_step": "awaiting_human_review"}

    async def fake_feedback(state):
        call_order.append("feedback_synthesizer")
        return {**state, "current_step": "feedback_generated", "overall_comments": "done"}

    state_with_review = {**sample_workflow_state, "reviewed_grades": sample_workflow_state["proposed_grades"]}

    with patch("agents.workflow.RubricAnalyzerAgent.analyze", new=fake_rubric_analyzer), patch(
        "agents.workflow.StandardSetterAgent.analyze", new=fake_standard_setter
    ), patch("agents.workflow.GradingAgent.grade", new=fake_grading_agent), patch(
        "agents.workflow.GradingWorkflow._await_human_review", new=staticmethod(fake_await_review)
    ), patch("agents.workflow.FeedbackSynthesizerAgent.synthesize", new=fake_feedback):
        workflow = GradingWorkflow()
        result = asyncio.run(workflow.run_until_human_review(state_with_review))

    assert call_order == ["rubric_analyzer", "standard_setter", "grading_agent", "await_human_review", "feedback_synthesizer"]
    assert result["current_step"] == "feedback_generated"
    assert result["overall_comments"] == "done"


def test_run_after_human_review_calls_feedback_synthesizer(sample_workflow_state):
    final_state = {**sample_workflow_state, "current_step": "feedback_generated", "overall_comments": "ok"}

    with patch("agents.workflow.FeedbackSynthesizerAgent.synthesize", new=AsyncMock(return_value=final_state)) as mock_feedback:
        workflow = GradingWorkflow()
        result = asyncio.run(workflow.run_after_human_review(sample_workflow_state))

    assert result["current_step"] == "feedback_generated"
    mock_feedback.assert_awaited_once()
