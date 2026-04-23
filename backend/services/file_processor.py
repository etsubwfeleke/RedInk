import base64
import json
from typing import Optional
import logging
import PyPDF2
from io import BytesIO
from docx import Document


logger = logging.getLogger(__name__)

class FileProcessor:
    @staticmethod
    def process_file(base64_content: str, filename: str) -> str:
        """
        Process different file types and extract text content
        """
        try:
            logger.debug("Processing file: %s", filename)
            # Decode base64
            file_bytes = base64.b64decode(base64_content)
            
            # Determine file type from extension
            ext = filename.lower().split('.')[-1]
            logger.info("Detected file extension '%s' for %s", ext, filename)
            
            if ext == 'pdf':
                return FileProcessor._process_pdf(file_bytes)
            elif ext in ['docx', 'doc']:
                return FileProcessor._process_docx(file_bytes)
            elif ext in ['txt', 'md']:
                return FileProcessor._process_text(file_bytes)
            elif ext in ['py', 'js', 'java', 'cpp', 'c', 'h', 'css', 'html', 'jsx', 'tsx', 'ts', 'rb', 'go', 'rs', 'swift', 'kt', 'php', 'sql', 'sh', 'r']:
                return FileProcessor._process_code(file_bytes, ext)
            elif ext == 'ipynb':
                return FileProcessor._process_notebook(file_bytes)
            elif ext in ['json']:
                return FileProcessor._process_json(file_bytes)
            else:
                logger.warning("Unsupported file type '%s' for file %s", ext, filename)
                raise ValueError(f"Unsupported file type: {ext}")
                
        except Exception as e:
            logger.exception("Error processing file: %s", filename)
            raise Exception(f"Error processing file {filename}: {str(e)}")
    
    @staticmethod
    def _process_pdf(file_bytes: bytes) -> str:
        """Extract text from PDF"""
        pdf_file = BytesIO(file_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        logger.debug("Extracted PDF text length: %d", len(text.strip()))
        
        return text.strip()
    
    @staticmethod
    def _process_docx(file_bytes: bytes) -> str:
        """Extract text from DOCX"""
        docx_file = BytesIO(file_bytes)
        doc = Document(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        logger.debug("Extracted DOCX text length: %d", len(text.strip()))
        
        return text.strip()
    
    @staticmethod
    def _process_text(file_bytes: bytes) -> str:
        """Process plain text files"""
        try:
            # Try UTF-8 first
            logger.debug("Decoding text file as UTF-8")
            return file_bytes.decode('utf-8').strip()
        except UnicodeDecodeError:
            # Fallback to latin-1
            logger.debug("UTF-8 decode failed, falling back to latin-1")
            return file_bytes.decode('latin-1').strip()
    
    @staticmethod
    def _process_code(file_bytes: bytes, ext: str) -> str:
        """
        Process code files - preserve formatting and add language context
        """
        try:
            code_content = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            code_content = file_bytes.decode('latin-1')
        
        # Add language context for better AI understanding
        language_map = {
            'py': 'Python',
            'js': 'JavaScript',
            'jsx': 'JavaScript (React)',
            'ts': 'TypeScript',
            'tsx': 'TypeScript (React)',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'h': 'C/C++ Header',
            'cs': 'C#',
            'rb': 'Ruby',
            'go': 'Go',
            'rs': 'Rust',
            'swift': 'Swift',
            'kt': 'Kotlin',
            'php': 'PHP',
            'sql': 'SQL',
            'sh': 'Shell Script',
            'r': 'R',
            'css': 'CSS',
            'html': 'HTML'
        }
        
        language = language_map.get(ext, ext.upper())
        
        # Format with language marker
        formatted = f"# Programming Language: {language}\n\n"
        formatted += f"```{ext}\n{code_content}\n```"
        logger.debug("Processed code file as %s with content length=%d", language, len(code_content))
        
        return formatted
    
    @staticmethod
    def _process_notebook(file_bytes: bytes) -> str:
        """
        Process Jupyter notebooks - extract code and markdown cells
        """
        try:
            notebook_content = file_bytes.decode('utf-8')
            notebook = json.loads(notebook_content)
        except Exception as e:
            logger.exception("Failed to parse Jupyter notebook")
            raise Exception(f"Error parsing Jupyter notebook: {str(e)}")
        
        extracted = "# Jupyter Notebook\n\n"
        
        cells = notebook.get('cells', [])
        logger.info("Processing notebook with %d cells", len(cells))
        for idx, cell in enumerate(cells, 1):
            cell_type = cell.get('cell_type', '')
            source = cell.get('source', [])
            
            # Join source lines
            if isinstance(source, list):
                content = ''.join(source)
            else:
                content = source
            
            if cell_type == 'markdown':
                extracted += f"## Markdown Cell {idx}\n\n{content}\n\n"
            elif cell_type == 'code':
                extracted += f"## Code Cell {idx}\n\n```python\n{content}\n```\n\n"
                
                # Include outputs if present
                outputs = cell.get('outputs', [])
                if outputs:
                    extracted += "**Output:**\n\n"
                    for output in outputs:
                        if 'text' in output:
                            text = output['text']
                            if isinstance(text, list):
                                text = ''.join(text)
                            extracted += f"```\n{text}\n```\n\n"
        
        return extracted.strip()
    
    @staticmethod
    def _process_json(file_bytes: bytes) -> str:
        """Process JSON files with pretty formatting"""
        try:
            json_content = file_bytes.decode('utf-8')
            data = json.loads(json_content)
            # Pretty print JSON
            return f"# JSON File\n\n```json\n{json.dumps(data, indent=2)}\n```"
        except Exception as e:
            logger.exception("Failed to parse JSON content")
            raise Exception(f"Error parsing JSON: {str(e)}")