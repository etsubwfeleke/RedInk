from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class LLMProvider(str, Enum):
    CLAUDE = "claude"
    OPENAI = "openai"


class GradingConfig(BaseModel):
    model_config = {"protected_namespaces": ()}  # Add this line
    
    llm_provider: LLMProvider
    api_key: str
    model_name: Optional[str] = None


class RubricCriterion(BaseModel):
    name: str
    description: str
    max_points: float
    weight: Optional[float] = 1.0


class RubricAnalysis(BaseModel):
    criteria: List[RubricCriterion]
    total_points: float
    grading_guidelines: str


class StandardAnalysis(BaseModel):
    criterion_name: str
    excellent_characteristics: List[str]
    key_elements: List[str]


class ProposedGrade(BaseModel):
    criterion_name: str
    score: float
    max_points: float
    reasoning: str
    evidence: List[str]
    suggestions: List[str]


class HumanReviewedGrade(BaseModel):
    criterion_name: str
    score: float
    max_points: float
    reasoning: str
    ta_notes: Optional[str] = None


class FeedbackItem(BaseModel):
    criterion_name: str
    strengths: List[str]
    areas_for_improvement: List[str]
    specific_suggestions: List[str]


class GradingResult(BaseModel):
    student_name: Optional[str] = None
    total_score: float
    max_total_score: float
    percentage: float
    grades: List[HumanReviewedGrade]
    feedback: List[FeedbackItem]
    overall_comments: str


class GradingRequest(BaseModel):
    config: GradingConfig
    rubric_content: str  # Base64 encoded or text
    rubric_filename: str
    golden_content: Optional[str] = None  # Base64 encoded or text
    golden_filename: Optional[str] = None
    student_content: str  # Base64 encoded or text
    student_filename: str


class AgentState(BaseModel):
    """State shared across all agents in the workflow"""
    config: GradingConfig
    rubric_content: str
    rubric_analysis: Optional[RubricAnalysis] = None
    golden_content: Optional[str] = None
    standard_analysis: Optional[List[StandardAnalysis]] = None
    student_content: str
    proposed_grades: Optional[List[ProposedGrade]] = None
    reviewed_grades: Optional[List[HumanReviewedGrade]] = None
    feedback: Optional[List[FeedbackItem]] = None
    overall_comments: Optional[str] = None
    error: Optional[str] = None
    current_step: str = "initialized"

    class Config:
        arbitrary_types_allowed = True
