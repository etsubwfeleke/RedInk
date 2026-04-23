# Multi-Agent Grading Assistant: Technical Report

**Candidate:** Etsub Feleke  
**Position:** Junior Forward Deployed Engineer  
**Date:** April 22, 2026  
**Project Repository:** [GitHub URL will be provided]

## 1. Multi-Agent Architecture

### System Design

The Multi-Agent Grading Assistant implements a collaborative agent system designed to evaluate student assignments with human oversight. The system consists of four specialized agents orchestrated through LangGraph:

**Agent Types and Responsibilities:**

1. **Rubric Analyzer Agent**: Parses grading rubrics to extract criteria, point allocations, and grading guidelines. This agent structures unstructured rubric documents into machine-readable formats.

2. **Standard Setter Agent**: Analyzes exemplary "golden" assignments to establish baselines for excellence. This optional agent identifies characteristics that distinguish high-quality work.

3. **Grading Agent**: Evaluates student submissions against rubric criteria, proposes scores, provides detailed reasoning, cites evidence from student work, and suggests improvements. Critically, this agent's outputs are proposals, not final decisions.

4. **Feedback Synthesizer Agent**: Generates constructive, actionable feedback based on human-approved grades. This agent creates personalized comments acknowledging strengths and identifying growth areas.

**Communication Patterns:**

Agents operate sequentially with message passing through a shared state dictionary managed by LangGraph. Each agent:
- Receives the current state
- Performs its specialized task
- Returns an updated state with new information
- Passes control to the next agent

The workflow includes a human-in-the-loop checkpoint after the Grading Agent, where teaching assistants review and adjust AI-proposed grades before feedback generation. This design prioritizes augmentation over automation.

**Hierarchical Structure:**

The system uses an orchestration layer (LangGraph StateGraph) that manages:
- Sequential agent execution
- State transitions and validation
- Error propagation and handling
- Session management via workflow IDs

This hierarchy ensures clear separation of concerns while maintaining workflow coherence.

## 2. Security, Safety, and Guardrails

### Input Validation

- **File type restrictions**: Only PDF, DOCX, MD, and TXT files accepted
- **Base64 encoding validation**: Prevents malformed file uploads
- **API key format validation**: Ensures proper credential structure
- **Schema validation**: Pydantic models enforce type safety throughout the system

### Guardrails for LLM Usage

**Role Constraints:**
- Each agent has a specific system prompt defining its purpose and boundaries
- Agents cannot deviate from their assigned tasks
- Temperature set to 0 for deterministic, consistent outputs

**Output Filtering:**
- All LLM outputs parsed as JSON with strict schema validation
- Malformed responses trigger error states rather than proceeding
- Markdown code fences automatically stripped during parsing
- Score validation prevents exceeding maximum point values

**Policy Enforcement:**
- Human review mandatory before finalization
- All grades require accompanying reasoning
- Evidence from student work required for scoring decisions

### Data Handling Considerations

**PII Protection:**
- No persistent storage of student data
- API keys stored only in memory during active sessions
- Session data deleted immediately after completion
- No logging of student submissions or grades

**Secrets Management:**
- API keys never logged or persisted
- Users provide their own API keys (not stored server-side)
- In-memory only storage during workflow execution

### Measures to Prevent Unintended Actions

**Human-in-the-Loop Design:**
- System cannot finalize grades without human approval
- TA review checkpoint is non-optional
- Override capability for all AI decisions

**Escalation Prevention:**
- Error states halt workflow rather than proceeding with partial data
- Graceful degradation when optional components (golden assignment) unavailable
- Session isolation prevents cross-contamination between grading workflows

## 3. Implementation Approach

### Tools and Frameworks

**Backend Stack:**
- **Python 3.11**: Core language
- **FastAPI**: REST API framework for high-performance async endpoints
- **LangGraph**: Orchestrates multi-agent workflows with state management
- **LangChain**: Provides LLM abstraction supporting multiple providers
- **Pydantic**: Type-safe data validation and serialization

**Frontend Stack:**
- **React 18**: Component-based UI framework
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool and dev server
- **Axios**: HTTP client for API communication

**Infrastructure:**
- **Docker**: Containerization for consistent deployment
- **Google Cloud Run**: Serverless hosting with automatic scaling
- **Cloud Build**: CI/CD pipeline

### Agent Instantiation and Coordination

Agents are implemented as stateless async functions within a LangGraph StateGraph:

```python
workflow = StateGraph(GradingWorkflowState)
workflow.add_node("rubric_analyzer", RubricAnalyzerAgent.analyze)
workflow.add_node("grading_agent", GradingAgent.grade)
workflow.add_edge("rubric_analyzer", "standard_setter")
```

The StateGraph compiles into an executable workflow that manages:
- Sequential invocation based on defined edges
- State propagation between agents
- Conditional routing based on state values

Sessions are coordinated via unique workflow IDs, enabling the API to pause execution for human review and resume afterward.

### Error Handling, Retries, and Failures

**Error Handling Strategy:**
- Try-catch blocks wrap all LLM calls
- Failures populate an "error" field in state
- Workflow transitions to "error" step on failures
- HTTP 500 responses returned to frontend with error details

**Current Limitations:**
- No automatic retries (future enhancement)
- Single-attempt LLM calls (reduces latency and cost for demo)

**Graceful Degradation:**
- System continues without golden assignment if not provided
- Frontend displays user-friendly error messages
- State cleanup occurs even on errors

### Evaluation and Testing Approach

**Validation Strategy:**
- Pydantic schema validation ensures type correctness
- JSON parsing with error handling validates LLM outputs
- Manual testing with real rubrics and assignments from my TA work

**Testing Performed:**
- File processing with actual student submissions
- End-to-end workflow with Data Visualization lab rubric
- Cross-provider testing (Claude and GPT-4)

**Production Readiness:**
This is a functional MVP. Production deployment would add:
- Comprehensive unit and integration tests
- Monitoring and observability
- Rate limiting and quota management
- Database for session persistence

## 4. Use of AI/LLMs and Collaboration

### LLM Usage

LLMs power four distinct reasoning tasks:

1. **Rubric Analysis**: Extracting structured criteria from unstructured documents
2. **Standard Setting**: Identifying patterns of excellence in reference work
3. **Grading**: Evaluating student work with detailed justification
4. **Feedback Generation**: Creating personalized, constructive comments

All LLM calls use temperature=0 for consistency and structured JSON outputs for validation.

### Agent Collaboration

Agents **do not negotiate**. Instead, they operate in a sequential pipeline where:
- Each agent enriches the shared state
- Downstream agents consume upstream outputs
- No circular dependencies or negotiations exist

This design provides clarity and predictability while maintaining the benefits of specialization.

### Trade-offs: Autonomy vs. Control

**Design Philosophy:**

This system prioritizes **control over autonomy**. The human-in-the-loop checkpoint is the defining feature:

**Autonomy Granted:**
- Agents independently analyze, grade, and synthesize
- LLM reasoning determines proposed scores
- Feedback generation adapts to final grades

**Control Maintained:**
- Human approval required before finalization
- TA can adjust any score and add notes
- Final feedback reflects human-approved grades, not AI proposals

**Rationale:**

In educational contexts, fairness and accountability are paramount. While AI can accelerate grading and improve consistency, final judgment must remain with human educators. This design acknowledges that AI is a powerful tool for augmentation but inappropriate for full automation in high-stakes decision-making like grading.

## Conclusion

This multi-agent grading system demonstrates practical application of collaborative AI architecture with responsible guardrails. By combining specialized agents, human oversight, and thoughtful security design, it provides a realistic solution for a real-world problem I encounter as a TA. The system is deployable, demonstrable, and designed with enterprise considerations in mind.
