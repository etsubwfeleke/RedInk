from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import base64
import json

from models.schemas import (
    GradingConfig,
    GradingRequest,
    GradingResult,
    ProposedGrade,
    HumanReviewedGrade,
    LLMProvider
)
from services.file_processor import FileProcessor
from agents.workflow import GradingWorkflow

import os
os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Monkeypatch to fix langchain missing attributes
import langchain
if not hasattr(langchain, 'debug'):
    langchain.debug = False
if not hasattr(langchain, 'verbose'):
    langchain.verbose = False
if not hasattr(langchain, 'llm_cache'):
    langchain.llm_cache = None


app = FastAPI(title="Multi-Agent Grading Assistant")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store workflow states (in production, use Redis or similar)
workflow_states = {}


class InitiateGradingRequest(BaseModel):
    llm_provider: str
    api_key: str
    model_name: Optional[str] = None
    rubric_file: str  # base64
    rubric_filename: str
    golden_file: Optional[str] = None  # base64
    golden_filename: Optional[str] = None
    student_file: str  # base64
    student_filename: str


class ReviewGradesRequest(BaseModel):
    workflow_id: str
    reviewed_grades: List[HumanReviewedGrade]
    ta_notes: Optional[str] = None 


@app.get("/")
async def root():
    return {"message": "Multi-Agent Grading Assistant API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/grading/initiate")
async def initiate_grading(request: InitiateGradingRequest):
    """
    Initiate grading workflow - runs until human review checkpoint
    """
    try:
        # Process files
        rubric_content = FileProcessor.process_file(
            request.rubric_file,
            request.rubric_filename
        )
        
        golden_content = None
        if request.golden_file and request.golden_filename:
            golden_content = FileProcessor.process_file(
                request.golden_file,
                request.golden_filename
            )
        
        student_content = FileProcessor.process_file(
            request.student_file,
            request.student_filename
        )
        
        # Create config
        config = GradingConfig(
            llm_provider=LLMProvider(request.llm_provider),
            api_key=request.api_key,
            model_name=request.model_name
        )
        
        # Initialize workflow
        workflow = GradingWorkflow()
        
        # Prepare initial state
        initial_state = {
            "config": config,
            "rubric_content": rubric_content,
            "rubric_analysis": None,
            "golden_content": golden_content,
            "standard_analysis": None,
            "student_content": student_content,
            "proposed_grades": None,
            "reviewed_grades": None,
            "feedback": None,
            "overall_comments": None,
            "error": None,
            "current_step": "initialized"
        }
        
        # Run workflow until human review
        result_state = await workflow.run_until_human_review(initial_state)
        
        # Check for errors
        if result_state.get("error"):
            raise HTTPException(status_code=500, detail=result_state["error"])
        
        # Generate workflow ID
        import uuid
        workflow_id = str(uuid.uuid4())
        
        # Store state for later continuation
        workflow_states[workflow_id] = result_state
        
        # Return proposed grades for human review
        proposed_grades = result_state.get("proposed_grades", [])
        
        return {
            "workflow_id": workflow_id,
            "proposed_grades": [
                {
                    "criterion_name": g.criterion_name,
                    "score": g.score,
                    "max_points": g.max_points,
                    "reasoning": g.reasoning,
                    "evidence": g.evidence,
                    "suggestions": g.suggestions
                }
                for g in proposed_grades
            ],
            "status": "awaiting_review"
        }
        
    except Exception as e:
        import traceback
        print("=== FULL ERROR ===")
        print(traceback.format_exc())
        print("=== END ERROR ===")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/grading/state/{workflow_id}")
async def get_workflow_state(workflow_id: str):
    """
    Get current workflow state for review
    """
    try:
        if workflow_id not in workflow_states:
            raise HTTPException(status_code=404, detail="Workflow not found or expired")
        
        state = workflow_states[workflow_id]
        
        # Return the proposed grades for review
        proposed_grades = state.get("proposed_grades", [])
        
        return {
            "workflow_id": workflow_id,
            "proposed_grades": [
                {
                    "criterion_name": g.criterion_name,
                    "points_awarded": g.score,
                    "max_points": g.max_points,
                    "justification": g.reasoning,
                }
                for g in proposed_grades
            ],
            "current_step": state.get("current_step"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=== STATE FETCH ERROR ===")
        print(traceback.format_exc())
        print("=== END ERROR ===")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/grading/review")
async def submit_reviewed_grades(request: ReviewGradesRequest):
    """
    Submit human-reviewed grades and complete workflow
    """
    try:
        # Retrieve workflow state
        if request.workflow_id not in workflow_states:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        state = workflow_states[request.workflow_id]
        
        # Update state with reviewed grades
        state["reviewed_grades"] = request.reviewed_grades
        state["current_step"] = "human_review_complete"
        
        # Continue workflow (generate feedback)
        workflow = GradingWorkflow()
        final_state = await workflow.run_after_human_review(state)
        
        # Check for errors
        if final_state.get("error"):
            raise HTTPException(status_code=500, detail=final_state["error"])
        
        # Calculate totals
        total_score = sum(g.score for g in request.reviewed_grades)
        max_total = sum(g.max_points for g in request.reviewed_grades)
        percentage = (total_score / max_total * 100) if max_total > 0 else 0
        
        # Build result
        result = GradingResult(
            total_score=total_score,
            max_total_score=max_total,
            percentage=percentage,
            grades=request.reviewed_grades,
            feedback=final_state.get("feedback", []),
            overall_comments=final_state.get("overall_comments", "")
        )
        
        # Clean up state
        del workflow_states[request.workflow_id]
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=== FULL ERROR ===")
        print(traceback.format_exc())
        print("=== END ERROR ===")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
