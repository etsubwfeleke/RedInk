# Multi-Agent Grading Assistant

An AI-powered grading system that uses multiple specialized agents to evaluate student work with human-in-the-loop oversight.

## 🎯 Overview

This system demonstrates collaborative multi-agent architecture where specialized AI agents work together to:
1. Parse and understand grading rubrics
2. Analyze exemplary work to set standards
3. Evaluate student submissions
4. Generate constructive feedback

**Key Feature:** Human-in-the-loop review ensures AI grades are validated by teaching assistants before final feedback is generated.

## 🏗️ Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Orchestrator                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│   Rubric     │    │   Standard   │      │   Grading    │
│   Analyzer   │───▶│    Setter    │─────▶│    Agent     │
│    Agent     │    │    Agent     │      │              │
└──────────────┘    └──────────────┘      └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │    Human     │
                                          │   Review     │
                                          │  Checkpoint  │
                                          └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Feedback    │
                                          │ Synthesizer  │
                                          │    Agent     │
                                          └──────────────┘
```

### Agent Responsibilities

1. **Rubric Analyzer Agent**
   - Parses grading rubrics
   - Extracts criteria, point values, requirements
   - Identifies grading guidelines

2. **Standard Setter Agent**
   - Analyzes golden/reference assignments
   - Identifies characteristics of excellence
   - Sets comparison baseline for each criterion

3. **Grading Agent**
   - Evaluates student work against rubric
   - Proposes scores with detailed reasoning
   - Provides evidence from student submissions
   - Suggests improvements

4. **Feedback Synthesizer Agent**
   - Generates constructive feedback
   - Acknowledges strengths
   - Identifies areas for improvement
   - Provides actionable suggestions

### Communication Pattern

- **Sequential execution** with state sharing
- **Message passing** through LangGraph state
- **Human-in-the-loop** checkpoint between grading and feedback
- **Orchestration layer** manages workflow and error handling

## 🔒 Security & Guardrails

### Input Validation
- File type restrictions (PDF, DOCX, MD, TXT only)
- File size limits enforced
- Base64 encoding validation
- API key format validation

### LLM Usage Guardrails
- **Temperature = 0** for consistent, deterministic outputs
- **Structured JSON outputs** with schema validation
- **Role constraints**: Each agent has specific system prompts
- **Output filtering**: JSON parsing with error handling
- **Fallback mechanisms**: Error states trigger safe defaults

### Data Handling
- **No persistent storage** of student data or API keys
- **In-memory state** only during active sessions
- **Session isolation** via unique workflow IDs
- **Automatic cleanup** after grading completion
- **PII awareness**: No logging of student work

### Agent Safety Measures
- **No autonomous actions**: Human review required before finalization
- **Score validation**: Prevents scores exceeding max points
- **Reasoning required**: All grades must include justification
- **Audit trail**: TA notes captured for review
- **Graceful degradation**: System continues if optional components fail

## 🛠️ Implementation

### Technology Stack

**Backend:**
- FastAPI (REST API)
- LangGraph (Agent orchestration)
- LangChain (LLM abstraction)
- Pydantic (Data validation)
- PyPDF2, python-docx (File processing)

**Frontend:**
- React 18
- Tailwind CSS
- Axios (HTTP client)
- Vite (Build tool)

**Deployment:**
- Docker (Containerization)
- Google Cloud Run (Serverless hosting)
- Cloud Build (CI/CD)

### Agent Instantiation

Agents are defined as async functions within LangGraph:

```python
class RubricAnalyzerAgent:
    @staticmethod
    async def analyze(state: Dict[str, Any]) -> Dict[str, Any]:
        # Parse rubric, extract criteria
        # Return updated state
```

### Coordination & Termination

- **LangGraph StateGraph** manages execution flow
- **Conditional edges** route based on state
- **Error states** trigger workflow termination
- **END node** signals completion
- **Workflow IDs** enable session management

### Error Handling

```python
try:
    response = await LLMService.call_llm(...)
    # Process response
except Exception as e:
    return {
        **state,
        "error": f"Agent failed: {str(e)}",
        "current_step": "error"
    }
```

### Evaluation & Testing

- **Schema validation** ensures correct data structures
- **Unit tests** for file processing (can be added)
- **Integration tests** for full workflow (can be added)
- **Manual testing** with real rubrics and assignments

## 🚀 Deployment

### Prerequisites

- Google Cloud account
- gcloud CLI installed
- Docker installed (for local testing)

### Quick Start

1. **Clone and setup:**
```bash
git clone <repository-url>
cd grading-assistant
```

2. **Local development:**
```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

3. **Deploy to Google Cloud Run:**
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
./deploy.sh
```

### Environment Variables

- `VITE_API_URL`: Backend API URL (frontend)
- `PORT`: Server port (default: 8080)

## 📊 Use of AI/LLMs

### How LLMs Are Used

1. **Rubric Analysis**: Parse complex grading criteria from documents
2. **Standard Setting**: Identify patterns of excellence in reference work
3. **Grading**: Evaluate student work with detailed reasoning
4. **Feedback Generation**: Create constructive, actionable feedback

### LLM Provider Support

- **Claude (Anthropic)**: Recommended for complex reasoning
- **GPT-4 (OpenAI)**: Alternative option
- **Configurable**: Users select provider and model

### Agent Collaboration

Agents **don't negotiate** - they operate sequentially with clear handoffs:
- Each agent enhances the shared state
- Downstream agents use outputs from upstream agents
- Human review checkpoint validates AI decisions

### Autonomy vs. Control

**Design Philosophy: Augmentation, not Automation**

- **Controlled autonomy**: Agents propose, humans decide
- **Transparency**: All reasoning visible to TA
- **Override capability**: TA can adjust any score
- **Final authority**: Human review required for finalization

## 📝 Real-World Application

This system is designed for:
- **TAs** grading coding assignments, data viz projects, reports
- **Instructors** providing consistent feedback at scale
- **Students** receiving detailed, actionable feedback

**Not a replacement for human judgment** - a tool to make grading more efficient and consistent.

## 📄 License

MIT License (for demo purposes)

## 👤 Author

Etsub Feleke - Junior FDE Candidate
