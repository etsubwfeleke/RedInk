import base64
import io
from typing import Optional
import PyPDF2
import docx
import markdown


class FileProcessor:
    """Process uploaded files (PDF, DOCX, MD, TXT) and extract text content"""
    
    @staticmethod
    def detect_file_type(filename: str) -> str:
        """Detect file type from filename"""
        ext = filename.lower().split('.')[-1]
        return ext
    
    @staticmethod
    def process_file(content: str, filename: str) -> str:
        """
        Process file content based on type
        
        Args:
            content: Base64 encoded file content or raw text
            filename: Original filename
            
        Returns:
            Extracted text content
        """
        file_type = FileProcessor.detect_file_type(filename)
        
        # Try to decode base64 if it looks like base64
        try:
            if ',' in content:  # Data URL format
                content = content.split(',')[1]
            decoded = base64.b64decode(content)
            is_binary = True
        except Exception:
            # Already plain text
            decoded = content.encode('utf-8')
            is_binary = False
        
        # Process based on file type
        if file_type == 'pdf':
            return FileProcessor._process_pdf(decoded)
        elif file_type in ['docx', 'doc']:
            return FileProcessor._process_docx(decoded)
        elif file_type == 'md':
            return FileProcessor._process_markdown(decoded.decode('utf-8') if is_binary else content)
        elif file_type in ['txt', 'text']:
            return decoded.decode('utf-8') if is_binary else content
        else:
            # Default to treating as text
            return decoded.decode('utf-8') if is_binary else content
    
    @staticmethod
    def _process_pdf(content: bytes) -> str:
        """Extract text from PDF"""
        try:
            pdf_file = io.BytesIO(content)
            reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Failed to process PDF: {str(e)}")
    
    @staticmethod
    def _process_docx(content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            docx_file = io.BytesIO(content)
            doc = docx.Document(docx_file)
            
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            # Also extract from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells)
                    if row_text.strip():
                        text_parts.append(row_text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Failed to process DOCX: {str(e)}")
    
    @staticmethod
    def _process_markdown(content: str) -> str:
        """Process markdown (currently just returns as-is, but could convert to HTML if needed)"""
        return content
