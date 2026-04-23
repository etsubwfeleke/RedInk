import inspect
import pathlib
import sys
import types
from types import SimpleNamespace

import pytest


BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _install_stub_modules() -> None:
    messages_module = types.ModuleType("langchain_core.messages")

    class SystemMessage:
        def __init__(self, content):
            self.content = content

    class HumanMessage:
        def __init__(self, content):
            self.content = content

    messages_module.SystemMessage = SystemMessage
    messages_module.HumanMessage = HumanMessage

    core_module = types.ModuleType("langchain_core")
    core_module.messages = messages_module

    class _BaseChatModel:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        async def ainvoke(self, messages):
            return SimpleNamespace(content="stub response")

    anthropic_module = types.ModuleType("langchain_anthropic")
    anthropic_module.ChatAnthropic = _BaseChatModel

    openai_module = types.ModuleType("langchain_openai")
    openai_module.ChatOpenAI = _BaseChatModel

    graph_module = types.ModuleType("langgraph.graph")
    end_marker = "__end__"

    class CompiledGraph:
        def __init__(self, nodes, edges, entry_point):
            self.nodes = nodes
            self.edges = edges
            self.entry_point = entry_point

        async def ainvoke(self, initial_state):
            state = dict(initial_state)
            current_node = self.entry_point

            while current_node != end_marker:
                node_fn = self.nodes[current_node]
                result = node_fn(state)
                if inspect.isawaitable(result):
                    result = await result
                if result is not None:
                    state = result

                next_nodes = self.edges.get(current_node, [])
                if not next_nodes:
                    break
                current_node = next_nodes[0]

            return state

    class StateGraph:
        def __init__(self, state_type):
            self.state_type = state_type
            self.nodes = {}
            self.edges = {}
            self.entry_point = None

        def add_node(self, name, fn):
            self.nodes[name] = fn

        def add_edge(self, source, target):
            self.edges.setdefault(source, []).append(target)

        def set_entry_point(self, name):
            self.entry_point = name

        def compile(self):
            return CompiledGraph(self.nodes, self.edges, self.entry_point)

    graph_module.StateGraph = StateGraph
    graph_module.END = end_marker

    pypdf2_module = types.ModuleType("PyPDF2")

    class PdfReader:
        def __init__(self, file_obj):
            self.pages = []

    pypdf2_module.PdfReader = PdfReader

    docx_module = types.ModuleType("docx")

    def Document(file_obj=None):
        return SimpleNamespace(paragraphs=[], tables=[])

    docx_module.Document = Document

    markdown_module = types.ModuleType("markdown")
    markdown_module.markdown = lambda text: text

    sys.modules["langchain_core"] = core_module
    sys.modules["langchain_core.messages"] = messages_module
    sys.modules["langchain_anthropic"] = anthropic_module
    sys.modules["langchain_openai"] = openai_module
    sys.modules["langgraph"] = types.ModuleType("langgraph")
    sys.modules["langgraph"].graph = graph_module
    sys.modules["langgraph.graph"] = graph_module
    sys.modules["PyPDF2"] = pypdf2_module
    sys.modules["docx"] = docx_module
    sys.modules["markdown"] = markdown_module


_install_stub_modules()


@pytest.fixture(autouse=True)
def clear_workflow_state():
    from main import workflow_states

    workflow_states.clear()
    yield
    workflow_states.clear()


@pytest.fixture
def sample_config_claude():
    from models.schemas import GradingConfig, LLMProvider

    return GradingConfig(llm_provider=LLMProvider.CLAUDE, api_key="test-key")


@pytest.fixture
def sample_config_openai():
    from models.schemas import GradingConfig, LLMProvider

    return GradingConfig(
        llm_provider=LLMProvider.OPENAI,
        api_key="openai-key",
        model_name="gpt-4o-mini",
    )


@pytest.fixture
def sample_rubric_text():
    return (
        "Grading Rubric:\n"
        "1. Code Quality (10 points): Clean, well-structured code\n"
        "2. Documentation (5 points): Clear comments and docstrings\n"
    )


@pytest.fixture
def sample_golden_text():
    return "Golden assignment with excellent structure, documentation, and tests."


@pytest.fixture
def sample_student_text():
    return "Student assignment with partial implementation and limited comments."


@pytest.fixture
def sample_rubric_analysis():
    from models.schemas import RubricAnalysis, RubricCriterion

    return RubricAnalysis(
        criteria=[
            RubricCriterion(
                name="Code Quality",
                description="Clean, well-structured code",
                max_points=10.0,
                weight=1.0,
            ),
            RubricCriterion(
                name="Documentation",
                description="Clear comments and docstrings",
                max_points=5.0,
                weight=1.0,
            ),
        ],
        total_points=15.0,
        grading_guidelines="Reward clarity and correctness while penalizing missing explanations.",
    )


@pytest.fixture
def sample_standard_analysis():
    from models.schemas import StandardAnalysis

    return [
        StandardAnalysis(
            criterion_name="Code Quality",
            excellent_characteristics=["Modular design", "Readable naming"],
            key_elements=["Helper functions", "No duplication"],
        ),
        StandardAnalysis(
            criterion_name="Documentation",
            excellent_characteristics=["Docstrings for public methods"],
            key_elements=["Inline comments where needed"],
        ),
    ]


@pytest.fixture
def sample_proposed_grades():
    from models.schemas import ProposedGrade

    return [
        ProposedGrade(
            criterion_name="Code Quality",
            score=8.5,
            max_points=10.0,
            reasoning="Strong structure with minor refactoring opportunities.",
            evidence=["Used helper functions", "Consistent naming"],
            suggestions=["Split the large service into smaller units"],
        ),
        ProposedGrade(
            criterion_name="Documentation",
            score=3.5,
            max_points=5.0,
            reasoning="Some comments are present, but docstrings are incomplete.",
            evidence=["Comments in main logic"],
            suggestions=["Add docstrings to exported functions"],
        ),
    ]


@pytest.fixture
def sample_reviewed_grades():
    from models.schemas import HumanReviewedGrade

    return [
        HumanReviewedGrade(
            criterion_name="Code Quality",
            score=9.0,
            max_points=10.0,
            reasoning="Good structure with one missed edge case.",
            ta_notes="Accepted after TA review.",
        ),
        HumanReviewedGrade(
            criterion_name="Documentation",
            score=4.0,
            max_points=5.0,
            reasoning="Adequate comments after minor correction.",
        ),
    ]


@pytest.fixture
def sample_feedback_items():
    from models.schemas import FeedbackItem

    return [
        FeedbackItem(
            criterion_name="Code Quality",
            strengths=["Clear function boundaries"],
            areas_for_improvement=["Handle empty input explicitly"],
            specific_suggestions=["Add input validation at the service boundary"],
        ),
        FeedbackItem(
            criterion_name="Documentation",
            strengths=["Some useful comments"],
            areas_for_improvement=["Add module-level overview"],
            specific_suggestions=["Document the public API surface"],
        ),
    ]


@pytest.fixture
def sample_workflow_state(
    sample_config_claude,
    sample_rubric_text,
    sample_golden_text,
    sample_student_text,
    sample_rubric_analysis,
    sample_standard_analysis,
    sample_proposed_grades,
):
    return {
        "config": sample_config_claude,
        "rubric_content": sample_rubric_text,
        "rubric_analysis": sample_rubric_analysis,
        "golden_content": sample_golden_text,
        "standard_analysis": sample_standard_analysis,
        "student_content": sample_student_text,
        "proposed_grades": sample_proposed_grades,
        "reviewed_grades": None,
        "feedback": None,
        "overall_comments": None,
        "error": None,
        "current_step": "initialized",
    }


@pytest.fixture
def sample_file_contents(sample_rubric_text, sample_golden_text, sample_student_text):
    return {
        "rubric": sample_rubric_text,
        "golden": sample_golden_text,
        "student": sample_student_text,
    }


@pytest.fixture
def base64_text_content():
    import base64

    text = "Hello, encoded file content."
    return base64.b64encode(text.encode("utf-8")).decode("utf-8")
