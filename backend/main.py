from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import base64
import json
import logging
import sys

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

# Configure application logging (override with LOG_LEVEL env var)
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()


class ColorFormatter(logging.Formatter):
    """Colorized formatter to make backend logs easier to scan quickly."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    LEVEL_COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[41m",   # Red background
    }

    def __init__(self, use_color: bool):
        super().__init__()
        self.use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, datefmt="%Y-%m-%d %H:%M:%S")
        level = f"{record.levelname:<8}"
        logger_name = f"{record.name:<38.38}"
        location = f"{record.filename}:{record.lineno}"
        message = record.getMessage()

        if self.use_color:
            level_color = self.LEVEL_COLORS.get(record.levelname, "")
            level = f"{level_color}{self.BOLD}{level}{self.RESET}"
            timestamp = f"{self.DIM}{timestamp}{self.RESET}"
            logger_name = f"\033[35m{logger_name}{self.RESET}"
            location = f"{self.DIM}{location}{self.RESET}"

        line = f"{timestamp} | {level} | {logger_name} | {location} | {message}"

        if record.exc_info:
            line = f"{line}\n{self.formatException(record.exc_info)}"

        return line


def setup_logging() -> None:
    """Set root logger handler/formatter with readable structure and color."""
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(getattr(logging, LOG_LEVEL, logging.DEBUG))

    force_color = os.getenv("LOG_COLOR", "auto").lower()
    use_color = sys.stderr.isatty() if force_color == "auto" else force_color in {"1", "true", "yes", "on"}

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(ColorFormatter(use_color=use_color))
    root_logger.addHandler(stream_handler)

    # Keep our app logs detailed while reducing noisy dependency output.
    # Override with LOG_LIB_LEVEL if needed.
    lib_level_name = os.getenv("LOG_LIB_LEVEL", "WARNING").upper()
    lib_level = getattr(logging, lib_level_name, logging.WARNING)
    noisy_loggers = [
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "httpx",
        "httpcore",
        "openai",
        "anthropic",
        "langchain",
        "langchain_core",
        "langchain_community",
    ]
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(lib_level)


setup_logging()
logger = logging.getLogger(__name__)

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

class BulkGradingRequest(BaseModel):
    llm_provider: str
    api_key: str
    model_name: Optional[str] = None
    rubric_file: str  # base64
    rubric_filename: str
    golden_file: Optional[str] = None
    golden_filename: Optional[str] = None
    students: List[dict]  # [{"file_data": base64, "filename": str, "student_name": str}]
    additional_context: Optional[str] = None


@app.post("/api/grading/bulk-initiate")
async def initiate_bulk_grading(request: BulkGradingRequest):
    """
    Initiate bulk grading - process multiple students sequentially
    Returns workflow IDs for each student
    """
    try:
        logger.info("[BULK_INIT][START] students=%d rubric=%s golden_present=%s", len(request.students), request.rubric_filename, bool(request.golden_file and request.golden_filename))

        # Process rubric and golden (same for all students)
        logger.info("[BULK_INIT][STEP 1/4] Processing rubric file")
        rubric_content = FileProcessor.process_file(
            request.rubric_file,
            request.rubric_filename
        )
        logger.info("[BULK_INIT][STEP 1/4][DONE] Rubric processed")
        
        golden_content = None
        if request.golden_file and request.golden_filename:
            logger.info("[BULK_INIT][STEP 2/4] Processing golden assignment file")
            golden_content = FileProcessor.process_file(
                request.golden_file,
                request.golden_filename
            )
            logger.info("[BULK_INIT][STEP 2/4][DONE] Golden assignment processed")
        else:
            logger.info("[BULK_INIT][STEP 2/4][SKIP] No golden assignment provided")
        
        # Create config
        logger.info("[BULK_INIT][STEP 3/4] Building grading config provider=%s model=%s", request.llm_provider, request.model_name or "default")
        config = GradingConfig(
            llm_provider=LLMProvider(request.llm_provider),
            api_key=request.api_key,
            model_name=request.model_name
        )
        logger.info("[BULK_INIT][STEP 3/4][DONE] Config ready")
        
        # Process each student
        logger.info("[BULK_INIT][STEP 4/4] Running workflow per student")
        workflow = GradingWorkflow()
        results = []
        
        for student in request.students:
            try:
                logger.info("[BULK_INIT][STUDENT][START] name=%s filename=%s", student.get("student_name", "unknown"), student.get("filename", "unknown"))

                # Process student file
                student_content = FileProcessor.process_file(
                    student["file_data"],
                    student["filename"]
                )
                logger.info("[BULK_INIT][STUDENT] Content extraction complete name=%s", student.get("student_name", "unknown"))
                
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
                    "current_step": "initialized",
                    "additional_context": request.additional_context
                }
                
                # Run workflow until human review
                result_state = await workflow.run_until_human_review(initial_state)
                
                # Generate workflow ID
                import uuid
                workflow_id = str(uuid.uuid4())
                
                # Store state
                workflow_states[workflow_id] = result_state
                logger.debug("Stored workflow state for student=%s workflow_id=%s", student.get("student_name", "unknown"), workflow_id)
                
                # Get proposed grades
                proposed_grades = result_state.get("proposed_grades", [])
                
                results.append({
                    "student_name": student["student_name"],
                    "workflow_id": workflow_id,
                    "status": "success" if not result_state.get("error") else "error",
                    "error": result_state.get("error"),
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
                    ] if proposed_grades else []
                })
                logger.info("[BULK_INIT][STUDENT][DONE] name=%s workflow_id=%s status=%s", student.get("student_name", "unknown"), workflow_id, "success" if not result_state.get("error") else "error")
                
            except Exception as student_error:
                # If one student fails, continue with others
                logger.exception("Failed to process student submission: %s", student.get("student_name", "unknown"))
                results.append({
                    "student_name": student["student_name"],
                    "workflow_id": None,
                    "status": "error",
                    "error": str(student_error),
                    "proposed_grades": []
                })
                logger.info("[BULK_INIT][STUDENT][FAILED] name=%s error=%s", student.get("student_name", "unknown"), str(student_error))
        
        logger.info("[BULK_INIT][COMPLETE] total=%d success=%d failed=%d", len(request.students), len([r for r in results if r["status"] == "success"]), len([r for r in results if r["status"] == "error"]))
        return {
            "total_students": len(request.students),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
        
    except Exception as e:
        logger.exception("Bulk grading failed")
        raise HTTPException(status_code=500, detail=str(e))

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
        logger.info("[INIT_SINGLE][START] student_file=%s rubric=%s golden_present=%s", request.student_filename, request.rubric_filename, bool(request.golden_file and request.golden_filename))

        # Process files
        logger.info("[INIT_SINGLE][STEP 1/5] Processing rubric file")
        rubric_content = FileProcessor.process_file(
            request.rubric_file,
            request.rubric_filename
        )
        logger.info("[INIT_SINGLE][STEP 1/5][DONE] Rubric processed")
        
        golden_content = None
        if request.golden_file and request.golden_filename:
            logger.info("[INIT_SINGLE][STEP 2/5] Processing golden assignment file")
            golden_content = FileProcessor.process_file(
                request.golden_file,
                request.golden_filename
            )
            logger.info("[INIT_SINGLE][STEP 2/5][DONE] Golden assignment processed")
        else:
            logger.info("[INIT_SINGLE][STEP 2/5][SKIP] No golden assignment provided")
        
        logger.info("[INIT_SINGLE][STEP 3/5] Processing student assignment file")
        student_content = FileProcessor.process_file(
            request.student_file,
            request.student_filename
        )
        logger.info("[INIT_SINGLE][STEP 3/5][DONE] Student assignment processed")
        
        # Create config
        logger.info("[INIT_SINGLE][STEP 4/5] Building grading config provider=%s model=%s", request.llm_provider, request.model_name or "default")
        config = GradingConfig(
            llm_provider=LLMProvider(request.llm_provider),
            api_key=request.api_key,
            model_name=request.model_name
        )
        logger.info("[INIT_SINGLE][STEP 4/5][DONE] Config ready")
        
        # Initialize workflow
        logger.info("[INIT_SINGLE][STEP 5/5] Running workflow until human review checkpoint")
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
        logger.info("[INIT_SINGLE][STEP 5/5][DONE] Workflow run completed")
        
        # Check for errors
        if result_state.get("error"):
            raise HTTPException(status_code=500, detail=result_state["error"])
        
        # Generate workflow ID
        import uuid
        workflow_id = str(uuid.uuid4())
        
        # Store state for later continuation
        workflow_states[workflow_id] = result_state
        logger.info("[INIT_SINGLE][COMPLETE] workflow_id=%s status=awaiting_review", workflow_id)
        
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
        logger.exception("Initiate grading failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/grading/state/{workflow_id}")
async def get_workflow_state(workflow_id: str):
    """
    Get current workflow state for review
    """
    try:
        logger.info("[STATE_GET][START] workflow_id=%s", workflow_id)
        if workflow_id not in workflow_states:
            raise HTTPException(status_code=404, detail="Workflow not found or expired")
        
        state = workflow_states[workflow_id]
        
        # Return the proposed grades for review
        proposed_grades = state.get("proposed_grades", [])
        
        logger.info("[STATE_GET][COMPLETE] workflow_id=%s proposed_grades=%d current_step=%s", workflow_id, len(proposed_grades), state.get("current_step"))
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
        logger.exception("Failed to fetch workflow state for workflow_id=%s", workflow_id)
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/grading/review")
async def submit_reviewed_grades(request: ReviewGradesRequest):
    """
    Submit human-reviewed grades and complete workflow
    """
    try:
        logger.info("[REVIEW_SUBMIT][START] workflow_id=%s reviewed_grades=%d", request.workflow_id, len(request.reviewed_grades))

        # Retrieve workflow state
        if request.workflow_id not in workflow_states:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        state = workflow_states[request.workflow_id]
        
        # Update state with reviewed grades
        state["reviewed_grades"] = request.reviewed_grades
        state["current_step"] = "human_review_complete"
        
        # Continue workflow (generate feedback)
        logger.info("[REVIEW_SUBMIT][STEP 1/3] Continuing workflow after human review")
        workflow = GradingWorkflow()
        final_state = await workflow.run_after_human_review(state)
        logger.info("[REVIEW_SUBMIT][STEP 1/3][DONE] Feedback synthesis stage finished")
        
        # Check for errors
        if final_state.get("error"):
            raise HTTPException(status_code=500, detail=final_state["error"])
        
        # Calculate totals
        logger.info("[REVIEW_SUBMIT][STEP 2/3] Calculating aggregate score")
        total_score = sum(g.score for g in request.reviewed_grades)
        max_total = sum(g.max_points for g in request.reviewed_grades)
        percentage = (total_score / max_total * 100) if max_total > 0 else 0
        logger.info("[REVIEW_SUBMIT][STEP 2/3][DONE] total=%.2f max=%.2f percent=%.2f", total_score, max_total, percentage)
        
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
        logger.info("[REVIEW_SUBMIT][STEP 3/3] Cleaning workflow state")
        del workflow_states[request.workflow_id]
        logger.info("[REVIEW_SUBMIT][COMPLETE] workflow_id=%s state_removed=true", request.workflow_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Submit reviewed grades failed for workflow_id=%s", request.workflow_id)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
