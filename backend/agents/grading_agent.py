import json
from typing import Dict, Any
import logging
from services.llm_service import LLMService
from models.schemas import ProposedGrade


logger = logging.getLogger(__name__)


class GradingAgent:
    """Agent responsible for proposing grades for student work"""
    
    SYSTEM_PROMPT = """You are a Grading Agent. Your job is to evaluate student work against rubric criteria and propose scores.

IMPORTANT PRINCIPLES:
1. Be FAIR and OBJECTIVE - base scores only on evidence in the submission
2. Be SPECIFIC - cite exact examples from the student's work
3. Be BALANCED - acknowledge both strengths and weaknesses
4. Be CONSTRUCTIVE - suggest specific improvements
5. Compare to the standard/golden assignment if provided

For each criterion, provide:
- Proposed score (be conservative, not lenient)
- Clear reasoning based on rubric requirements
- Specific evidence from the student work
- Suggestions for improvement

Output as JSON in this format:
{
    "proposed_grades": [
        {
            "criterion_name": "Criterion Name",
            "score": 8.5,
            "max_points": 10.0,
            "reasoning": "Detailed explanation of why this score",
            "evidence": ["Quote or reference from student work"],
            "suggestions": ["Specific improvement suggestion"]
        }
    ]
}
"""
    
    @staticmethod
    async def grade(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Propose grades for the student assignment
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with proposed grades
        """
        rubric_analysis = state["rubric_analysis"]
        student_content = state["student_content"]
        standard_analysis = state.get("standard_analysis")
        config = state["config"]
        
        # Format criteria for prompt
        criteria_list = "\n".join([
            f"- {c.name} ({c.max_points} points): {c.description}"
            for c in rubric_analysis.criteria
        ])
        
        # Format standards if available
        standards_text = ""
        if standard_analysis:
            standards_text = "\n\nSTANDARDS FROM GOLDEN ASSIGNMENT:\n"
            for std in standard_analysis:
                standards_text += f"\n{std.criterion_name}:\n"
                standards_text += f"  Excellence indicators: {', '.join(std.excellent_characteristics)}\n"
                standards_text += f"  Key elements: {', '.join(std.key_elements)}\n"
        
        user_prompt = f"""Grade this student assignment against the rubric criteria.

RUBRIC CRITERIA:
{criteria_list}

GRADING GUIDELINES:
{rubric_analysis.grading_guidelines}
{standards_text}

STUDENT ASSIGNMENT:
{student_content}

Evaluate the student work for each criterion. Be fair but thorough. Provide specific evidence.
Return the structured JSON with proposed grades."""
        
        try:
            logger.info("Starting grading for %d rubric criteria", len(rubric_analysis.criteria))
            response = await LLMService.call_llm(
                config=config,
                system_prompt=GradingAgent.SYSTEM_PROMPT,
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
            
            grades_dict = json.loads(response_clean)
            
            # Convert to Pydantic models
            proposed_grades = [ProposedGrade(**g) for g in grades_dict["proposed_grades"]]
            logger.info("Grading complete with %d proposed grades", len(proposed_grades))
            
            return {
                **state,
                "proposed_grades": proposed_grades,
                "current_step": "grades_proposed"
            }
            
        except Exception as e:
            logger.exception("Grading failed")
            return {
                **state,
                "error": f"Grading failed: {str(e)}",
                "current_step": "error"
            }
