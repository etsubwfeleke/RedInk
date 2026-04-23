import json
from typing import Dict, Any
import logging
from services.llm_service import LLMService
from models.schemas import RubricAnalysis, RubricCriterion


logger = logging.getLogger(__name__)


class RubricAnalyzerAgent:
    """Agent responsible for parsing and understanding the rubric"""
    
    SYSTEM_PROMPT = """You are a Rubric Analyzer Agent. Your job is to carefully read and parse grading rubrics to extract:
1. All grading criteria
2. Point values for each criterion
3. Specific requirements and expectations
4. Grading guidelines

Be extremely thorough and precise. Extract every criterion, even minor ones.

Output your analysis as JSON in the following format:
{
    "criteria": [
        {
            "name": "Criterion Name",
            "description": "What this criterion evaluates",
            "max_points": 10.0,
            "weight": 1.0
        }
    ],
    "total_points": 100.0,
    "grading_guidelines": "Overall approach to grading based on the rubric"
}
"""
    
    @staticmethod
    async def analyze(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the rubric and extract criteria
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with rubric analysis
        """
        rubric_content = state["rubric_content"]
        config = state["config"]
        
        user_prompt = f"""Analyze this grading rubric and extract all grading criteria:

RUBRIC:
{rubric_content}

Parse this rubric completely and return the structured JSON analysis."""
        
        try:
            logger.info("Starting rubric analysis")
            logger.debug(
                "Rubric analyzer config provider=%s api_key_present=%s rubric_content_len=%d",
                config.llm_provider,
                bool(config.api_key),
                len(rubric_content),
            )
            
            response = await LLMService.call_llm(
                config=config,
                system_prompt=RubricAnalyzerAgent.SYSTEM_PROMPT,
                user_prompt=user_prompt
            )
            logger.debug("Rubric analyzer raw response length=%d", len(response))
            
            # Parse JSON response
            # Remove markdown code blocks if present
            response_clean = response.strip()
            if response_clean.startswith("```json"):
                response_clean = response_clean[7:]
            if response_clean.startswith("```"):
                response_clean = response_clean[3:]
            if response_clean.endswith("```"):
                response_clean = response_clean[:-3]
            response_clean = response_clean.strip()
            
            analysis_dict = json.loads(response_clean)
            
            # Convert to Pydantic model
            criteria = [RubricCriterion(**c) for c in analysis_dict["criteria"]]
            rubric_analysis = RubricAnalysis(
                criteria=criteria,
                total_points=analysis_dict["total_points"],
                grading_guidelines=analysis_dict["grading_guidelines"]
            )
            logger.info("Rubric analysis complete with %d criteria", len(criteria))
            
            return {
                **state,
                "rubric_analysis": rubric_analysis,
                "current_step": "rubric_analyzed"
            }
            
        except Exception as e:
            logger.exception("Rubric analysis failed")
    
            return {
                **state,
                "error": f"Rubric analysis failed: {str(e)}",
                "current_step": "error"
            }
