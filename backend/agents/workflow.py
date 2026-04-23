from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, END
from agents.rubric_analyzer import RubricAnalyzerAgent
from agents.standard_setter import StandardSetterAgent
from agents.grading_agent import GradingAgent
from agents.feedback_synthesizer import FeedbackSynthesizerAgent


class GradingWorkflowState(TypedDict):
    """State type for the grading workflow"""
    config: Dict[str, Any]
    rubric_content: str
    rubric_analysis: Any
    golden_content: str
    standard_analysis: Any
    student_content: str
    proposed_grades: Any
    reviewed_grades: Any
    feedback: Any
    overall_comments: str
    error: str
    current_step: str


class GradingWorkflow:
    """LangGraph workflow for multi-agent grading system"""
    
    def __init__(self):
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow"""
        
        # Create the graph
        workflow = StateGraph(GradingWorkflowState)
        
        # Add nodes (agents)
        workflow.add_node("rubric_analyzer", RubricAnalyzerAgent.analyze)
        workflow.add_node("standard_setter", StandardSetterAgent.analyze)
        workflow.add_node("grading_agent", GradingAgent.grade)
        workflow.add_node("await_human_review", self._await_human_review)
        workflow.add_node("feedback_synthesizer", FeedbackSynthesizerAgent.synthesize)
        
        # Define edges (workflow)
        workflow.set_entry_point("rubric_analyzer")
        workflow.add_edge("rubric_analyzer", "standard_setter")
        workflow.add_edge("standard_setter", "grading_agent")
        workflow.add_edge("grading_agent", "await_human_review")
        workflow.add_edge("await_human_review", "feedback_synthesizer")
        workflow.add_edge("feedback_synthesizer", END)
        
        return workflow.compile()
    
    @staticmethod
    async def _await_human_review(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Placeholder for human review step.
        In practice, this is where the workflow pauses for human input.
        The actual human review happens in the API endpoint.
        """
        return {
            **state,
            "current_step": "awaiting_human_review"
        }
    
    async def run_until_human_review(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run workflow until it reaches the human review step
        """
        # Run each agent manually instead of using the full workflow
        from agents.rubric_analyzer import RubricAnalyzerAgent
        from agents.standard_setter import StandardSetterAgent
        from agents.grading_agent import GradingAgent
        
        # Step 1: Rubric analysis
        state = await RubricAnalyzerAgent.analyze(initial_state)
        if state.get("error"):
            return state
        
        # Step 2: Standard setting
        state = await StandardSetterAgent.analyze(state)
        if state.get("error"):
            return state
        
        # Step 3: Grading
        state = await GradingAgent.grade(state)
        if state.get("error"):
            return state
        
        # Stop here - return state for human review
        state["current_step"] = "awaiting_human_review"
        return state
    
    async def run_after_human_review(self, state_with_reviews: Dict[str, Any]) -> Dict[str, Any]:
        """
        Continue workflow after human review is complete
        
        Args:
            state_with_reviews: State updated with human-reviewed grades
            
        Returns:
            Final state with feedback
        """
        # Just run feedback synthesizer
        result = await FeedbackSynthesizerAgent.synthesize(state_with_reviews)
        return result
