import json
from typing import Dict, Any
import logging
from services.llm_service import LLMService
from models.schemas import StandardAnalysis


logger = logging.getLogger(__name__)


class StandardSetterAgent:
    """Agent responsible for analyzing the golden/reference assignment"""
    
    SYSTEM_PROMPT = """You are a Standard Setter Agent. Your job is to analyze exemplary student work (the "golden assignment") to understand what excellence looks like for each rubric criterion.

For each criterion in the rubric, identify:
1. What characteristics make this submission excellent
2. Key elements that demonstrate mastery
3. Specific examples from the submission

Output your analysis as JSON in the following format:
{
    "standards": [
        {
            "criterion_name": "Criterion Name",
            "excellent_characteristics": ["characteristic 1", "characteristic 2"],
            "key_elements": ["element 1", "element 2"]
        }
    ]
}
"""
    
    @staticmethod
    async def analyze(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the golden assignment to set standards
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with standard analysis
        """
        # If no golden assignment provided, skip this step
        if not state.get("golden_content"):
            logger.info("Skipping standard setting because no golden assignment was provided")
            return {
                **state,
                "standard_analysis": None,
                "current_step": "standards_set"
            }
        
        rubric_analysis = state["rubric_analysis"]
        golden_content = state["golden_content"]
        config = state["config"]
        
        # Check if rubric analysis exists
        if not rubric_analysis:
            logger.error("Standard setting cannot proceed: missing rubric analysis")
            return {
                **state,
                "error": "Rubric analysis is missing - rubric analyzer may have failed",
                "current_step": "error"
            }

        # Format criteria for prompt
        criteria_list = "\n".join([
            f"- {c.name} ({c.max_points} points): {c.description}"
            for c in rubric_analysis.criteria
        ])
        
        user_prompt = f"""Analyze this exemplary assignment against the rubric criteria.

RUBRIC CRITERIA:
{criteria_list}

GOLDEN ASSIGNMENT (Perfect Score Example):
{golden_content}

For each criterion, identify what makes this submission excellent and what elements demonstrate mastery.
Return the structured JSON analysis."""
        
        try:
            logger.info("Starting standard setting from golden assignment")
            response = await LLMService.call_llm(
                config=config,
                system_prompt=StandardSetterAgent.SYSTEM_PROMPT,
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
            
            analysis_dict = json.loads(response_clean)
            
            # Convert to Pydantic models
            standard_analysis = [StandardAnalysis(**s) for s in analysis_dict["standards"]]
            logger.info("Standard setting complete with %d standards", len(standard_analysis))
            
            return {
                **state,
                "standard_analysis": standard_analysis,
                "current_step": "standards_set"
            }
            
        except Exception as e:
            logger.exception("Standard setting failed")
            return {
                **state,
                "error": f"Standard setting failed: {str(e)}",
                "current_step": "error"
            }
