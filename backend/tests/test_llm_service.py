import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from models.schemas import GradingConfig, LLMProvider
from services.llm_service import LLMService


def test_get_llm_returns_claude_client_with_defaults(sample_config_claude):
    with patch("services.llm_service.ChatAnthropic") as mock_chat:
        client = LLMService.get_llm(sample_config_claude)

    mock_chat.assert_called_once_with(
        model="claude-3-5-sonnet-20241022",
        anthropic_api_key="test-key",
        max_tokens=4096,
        temperature=0,
    )
    assert client == mock_chat.return_value


def test_get_llm_returns_openai_client_with_custom_model(sample_config_openai):
    with patch("services.llm_service.ChatOpenAI") as mock_chat:
        client = LLMService.get_llm(sample_config_openai)

    mock_chat.assert_called_once_with(
        model="gpt-4o-mini",
        openai_api_key="openai-key",
        max_tokens=4096,
        temperature=0,
    )
    assert client == mock_chat.return_value


def test_get_llm_rejects_unknown_provider():
    config = GradingConfig(llm_provider=LLMProvider.CLAUDE, api_key="key")
    config.llm_provider = "unsupported"  # type: ignore[assignment]

    with pytest.raises(ValueError, match="Unsupported LLM provider"):
        LLMService.get_llm(config)


def test_call_llm_passes_system_and_human_messages(sample_config_claude):
    fake_llm = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content="LLM result")))

    with patch("services.llm_service.LLMService.get_llm", return_value=fake_llm):
        response = asyncio.run(LLMService.call_llm(sample_config_claude, "system prompt", "user prompt"))

    assert response == "LLM result"
    fake_llm.ainvoke.assert_awaited_once()
    messages = fake_llm.ainvoke.await_args.args[0]
    assert len(messages) == 2
    assert messages[0].content == "system prompt"
    assert messages[1].content == "user prompt"
