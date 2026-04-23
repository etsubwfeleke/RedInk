import json
from typing import Dict, Any, List
from services.llm_service import LLMService
from models.schemas import FeedbackItem, HumanReviewedGrade


class FeedbackSynthesizerAgent:
    """Agent responsible for generating constructive feedback based on final grades"""
    
    SYSTEM_PROMPT = """You are a Feedback Synthesizer Agent. Your job is to create constructive, actionable feedback for students based on their graded work.

IMPORTANT PRINCIPLES:
1. Be CONSTRUCTIVE - focus on growth and improvement
2. Be SPECIFIC - reference actual elements from their work
3. Be ENCOURAGING - acknowledge strengths before weaknesses
4. Be ACTIONABLE - give concrete steps for improvement
5. Be PROFESSIONAL - use supportive, educational tone

For each criterion, provide:
- Specific strengths (what they did well)
- Areas for improvement (what needs work)
- Specific, actionable suggestions

Also provide overall comments that:
- Summarize performance holistically
- Highlight major strengths
- Identify key areas for growth
- Encourage continued learning

Output as JSON in this format:
{
    "feedback_items": [
        {
            "criterion_name": "Criterion Name",
            "strengths": ["Specific strength 1", "Specific strength 2"],
            "areas_for_improvement": ["Area 1", "Area 2"],
            "specific_suggestions": ["Try doing X", "Consider Y"]
        }
    ],
    "overall_comments": "Holistic feedback paragraph"
}
"""
    
    @staticmethod
    async def synthesize(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate constructive feedback based on reviewed grades
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with feedback
        """
        reviewed_grades: List[HumanReviewedGrade] = state["reviewed_grades"]
        student_content = state["student_content"]
        rubric_analysis = state["rubric_analysis"]
        config = state["config"]
        
        # Format reviewed grades
        grades_summary = "\n".join([
            f"- {g.criterion_name}: {g.score}/{g.max_points} points\n  Reasoning: {g.reasoning}\n  TA Notes: {g.ta_notes or 'None'}"
            for g in reviewed_grades
        ])
        
        # Calculate total
        total_score = sum(g.score for g in reviewed_grades)
        max_total = sum(g.max_points for g in reviewed_grades)
        percentage = (total_score / max_total * 100) if max_total > 0 else 0
        
        user_prompt = f"""Generate constructive feedback for this student based on their graded work.

FINAL GRADES (TA-REVIEWED):
{grades_summary}

TOTAL: {total_score}/{max_total} ({percentage:.1f}%)

STUDENT WORK:
{student_content}

Create encouraging, specific, actionable feedback for each criterion and overall comments.
Return the structured JSON with feedback."""
        
        try:
            response = await LLMService.call_llm(
                config=config,
                system_prompt=FeedbackSynthesizerAgent.SYSTEM_PROMPT,
                user_prompt=user_prompt
            )
            
            # Parse JSON response
            response_clean = response.strip()
            if response_clean.startswith("```json"):
                response_clean = response_clean[7:]
            if response_clean.startswith("```"):
                response_clean = response_clean[3:]
            if response_clean.endswith("```"):
                response_clean = response_clean[:-3]
            response_clean = response_clean.strip()
            
            feedback_dict = json.loads(response_clean)
            
            # Convert to Pydantic models
            feedback_items = [FeedbackItem(**f) for f in feedback_dict["feedback_items"]]
            
            return {
                **state,
                "feedback": feedback_items,
                "overall_comments": feedback_dict["overall_comments"],
                "current_step": "feedback_generated"
            }
            
        except Exception as e:
            return {
                **state,
                "error": f"Feedback synthesis failed: {str(e)}",
                "current_step": "error"
            }
