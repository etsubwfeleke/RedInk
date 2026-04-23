from typing import Dict, Any
from services.file_processor import FileProcessor


class TextExtractorAgent:
    """Agent responsible for converting all files to plain text"""
    
    @staticmethod
    async def extract(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract text from all uploaded files
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state with extracted text
        """
        try:
            # Files are already processed by FileProcessor in the API
            # This agent just ensures they're in the right format
            # and could do additional cleaning if needed
            
            rubric_text = state["rubric_content"]
            student_text = state["student_content"]
            golden_text = state.get("golden_content")
            
            # Clean/normalize text (remove extra whitespace, etc.)
            rubric_clean = " ".join(rubric_text.split())
            student_clean = " ".join(student_text.split())
            golden_clean = " ".join(golden_text.split()) if golden_text else None
            
            return {
                **state,
                "rubric_content": rubric_clean,
                "student_content": student_clean,
                "golden_content": golden_clean,
                "current_step": "text_extracted"
            }
            
        except Exception as e:
            return {
                **state,
                "error": f"Text extraction failed: {str(e)}",
                "current_step": "error"
            }