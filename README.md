# RedInk - Multi-Agent Grading Assistant

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://redink-frontend-25mj4tmsxa-uc.a.run.app/)
[![Built with FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

**[Try RedInk Live](https://redink-frontend-25mj4tmsxa-uc.a.run.app/)**

## Video Demo

<video src="./output.mp4" controls width="900">
  Your browser does not support the video tag.
</video>


An AI-powered grading system that uses multiple specialized agents to evaluate student work with human-in-the-loop oversight. RedInk combines the analytical capabilities of large language models with the critical judgment of teaching assistants to deliver consistent, constructive feedback at scale.

---

## Overview

RedInk transforms the grading workflow by automating the analytical heavy lifting while keeping human judgment at the center. The system:

- **Understands** complex grading rubrics across multiple formats (PDF, DOCX, Markdown, plain text)
- **Learns** from exemplary student work to establish grading standards
- **Evaluates** submissions with detailed reasoning and evidence
- **Generates** constructive, actionable feedback tailored to each student

**Key Innovation:** Every grade passes through a mandatory human review checkpoint before feedback is finalized, ensuring AI suggestions are validated by teaching assistants.

---

## Architecture

### Multi-Agent Collaboration

RedInk employs a sequential multi-agent architecture where specialized AI agents work together through a shared state:

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Orchestrator                    │
│                 (Workflow State Management)                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│   Rubric     │    │   Standard   │      │   Grading    │
│   Analyzer   │───▶│    Setter    │─────▶│    Agent     │
│              │    │              │      │              │
│ • Parse      │    │ • Analyze    │      │ • Evaluate   │
│   criteria   │    │   golden     │      │ • Score      │
│ • Extract    │    │   examples   │      │ • Provide    │
│   point      │    │ • Identify   │      │   evidence   │
│   values     │    │   patterns   │      │              │
└──────────────┘    └──────────────┘      └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │    Human     │
                                          │   Review     │
                                          │  Checkpoint  │
                                          │              │
                                          │ TA validates │
                                          │ or adjusts   │
                                          └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Feedback    │
                                          │ Synthesizer  │
                                          │              │
                                          │ • Strengths  │
                                          │ • Areas to   │
                                          │   improve    │
                                          │ • Next steps │
                                          └──────────────┘
```

### Agent Specialization

Each agent has a focused responsibility:

| Agent | Purpose | Output |
|-------|---------|--------|
| **Rubric Analyzer** | Parses grading rubrics and extracts structured criteria | Criterion list with point values, requirements, and evaluation guidelines |
| **Standard Setter** | Analyzes reference/golden assignments to establish quality benchmarks | Patterns of excellence for each criterion |
| **Grading Agent** | Evaluates student work against rubric criteria | Proposed scores with detailed reasoning and evidence |
| **Feedback Synthesizer** | Generates constructive, actionable feedback | Personalized feedback highlighting strengths and improvement areas |

### Communication & State

- **Shared State**: Agents communicate via a LangGraph-managed state dictionary
- **Sequential Execution**: Each agent builds on the output of previous agents
- **Checkpoint System**: Workflow pauses for human review before finalization
- **Error Handling**: Failed agents gracefully degrade without breaking the pipeline

---

## Security & Safety

### Input Validation

```python
File type restrictions: PDF, DOCX, MD, TXT only
File size limits: 10MB max per file
Base64 encoding validation
API key format verification
Malformed input rejection
```

### LLM Usage Guardrails

- **Temperature = 0**: Deterministic, consistent outputs across runs
- **Structured JSON outputs**: Schema-validated responses prevent hallucinations
- **Role-specific prompts**: Each agent has constrained instructions
- **Output validation**: JSON parsing with fallback error handling
- **Score boundaries**: Prevents scores exceeding rubric maximums

### Data Privacy

```python
No persistent storage of student data
No logging of submission content
No API key retention
In-memory processing only
Session isolation via unique workflow IDs
Automatic cleanup after grading
```

### Human-in-the-Loop Safety

- **Mandatory review**: No grades finalized without TA approval
- **Full transparency**: All AI reasoning visible to reviewers
- **Override capability**: TAs can modify any score or comment
- **Audit trail**: TA notes captured for accountability
- **Graceful degradation**: Optional components (e.g., golden examples) can fail safely

---

## Technology Stack

### Backend

- **[FastAPI](https://fastapi.tiangolo.com/)**: High-performance async REST API
- **[LangGraph](https://github.com/langchain-ai/langgraph)**: Agent orchestration and state management
- **[LangChain](https://www.langchain.com/)**: LLM abstraction layer
- **[Pydantic](https://docs.pydantic.dev/)**: Data validation and settings management
- **PyPDF2 / python-docx**: Document parsing for rubrics and submissions

### Frontend

- **[React 18](https://react.dev/)**: Component-based UI framework
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first styling
- **[Axios](https://axios-http.com/)**: HTTP client for API communication
- **[Vite](https://vitejs.dev/)**: Lightning-fast development and build tool

### Infrastructure

- **[Google Cloud Run](https://cloud.google.com/run)**: Serverless container deployment
- **[Cloud Build](https://cloud.google.com/build)**: Automated CI/CD pipeline
- **[Docker](https://www.docker.com/)**: Containerization for consistent environments

### LLM Support

RedInk supports multiple LLM providers:

- **Anthropic Claude**: Recommended for complex reasoning tasks (Sonnet 4.5, Opus 4.6)
- **OpenAI GPT**: Alternative option (GPT-4, GPT-4 Turbo)
- **Configurable**: Users select provider and model at runtime

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Docker** (optional, for containerized deployment)
- **Google Cloud CLI** (for deployment to Cloud Run)

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/redink-grading-assistant.git
cd redink-grading-assistant
```

#### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The backend API will be available at `http://localhost:8080`

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### 4. Environment Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8080
```

### Production Deployment

#### Deploy to Google Cloud Run

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Run deployment script
./deploy.sh
```

The script will:
1. Build Docker containers for frontend and backend
2. Push images to Google Container Registry
3. Deploy services to Cloud Run
4. Configure networking and environment variables

#### Manual Deployment

**Backend:**
```bash
gcloud builds submit --config=backend/cloudbuild.yaml backend/
gcloud run deploy redink-backend \
  --image gcr.io/$GCP_PROJECT_ID/redink-backend:latest \
  --platform managed \
  --region $GCP_REGION \
  --allow-unauthenticated
```

**Frontend:**
```bash
gcloud builds submit --config=frontend/cloudbuild.yaml frontend/
gcloud run deploy redink-frontend \
  --image gcr.io/$GCP_PROJECT_ID/redink-frontend:latest \
  --platform managed \
  --region $GCP_REGION \
  --allow-unauthenticated \
  --set-env-vars VITE_API_URL=<backend-url>
```

---

## Usage

### Step-by-Step Grading Workflow

1. **Upload Rubric**: Provide the grading criteria (PDF, DOCX, MD, or TXT)
2. **Upload Golden Example** (Optional): Submit reference work to calibrate standards
3. **Select LLM Provider**: Choose between Anthropic Claude or OpenAI GPT
4. **Enter API Key**: Provide your LLM provider API key (not stored)
5. **Upload Student Submission**: Provide the work to be graded
6. **AI Analysis**: Agents process rubric, analyze submission, propose grades
7. **Human Review**: Review AI-proposed scores and reasoning
8. **Adjust & Approve**: Modify scores if needed, add TA notes
9. **Generate Feedback**: System creates personalized feedback for the student

### Example Use Cases

- **Coding Assignments**: Evaluate code quality, functionality, documentation
- **Data Visualization Projects**: Assess design choices, clarity, insights
- **Written Reports**: Grade structure, argumentation, evidence usage
- **Problem Sets**: Check correctness, approach, explanation quality

---

## How AI is Used

### LLM Role in Each Agent

| Agent | LLM Task | Why AI Helps |
|-------|----------|--------------|
| **Rubric Analyzer** | Extract criteria from unstructured text | Handles diverse rubric formats (tables, bullets, prose) |
| **Standard Setter** | Identify excellence patterns in reference work | Recognizes quality indicators humans might miss |
| **Grading Agent** | Evaluate against criteria with evidence | Consistent application of standards across submissions |
| **Feedback Synthesizer** | Generate constructive, tailored feedback | Personalized tone and actionable suggestions |

### Transparency & Explainability

Every AI decision includes:
- **Reasoning**: Why a score was assigned
- **Evidence**: Direct quotes/references from student work
- **Improvement suggestions**: Specific, actionable next steps

TAs see the complete thought process, not just final scores.

### Limitations & Design Choices

**What RedInk Does NOT Do:**
- Make final grading decisions autonomously
- Store or train on student data
- Provide feedback without human approval
- Replace instructor judgment on subjective criteria

**Design Philosophy:**
> "Augmentation, not automation. AI proposes, humans decide."

---

## Testing & Validation

### Schema Validation

All agent outputs are validated against Pydantic schemas:

```python
class GradingResult(BaseModel):
    criterion: str
    score: float
    max_score: float
    reasoning: str
    evidence: List[str]
```

Invalid outputs trigger error states and graceful degradation.

### Error Handling

```python
try:
    response = await agent.process(state)
    validate_schema(response)
    return updated_state
except ValidationError as e:
    return error_state(f"Schema validation failed: {e}")
except Exception as e:
    return error_state(f"Agent error: {e}")
```

### Future Testing Improvements

- [ ] Unit tests for file parsing logic
- [ ] Integration tests for full workflow
- [ ] Load testing for concurrent grading sessions
- [ ] Regression tests for schema changes

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **JavaScript**: ESLint + Prettier configuration included
- **Commits**: Use conventional commit messages

---

## License
