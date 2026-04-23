from typing import Dict, Any, Optional
import logging
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from models.schemas import LLMProvider, GradingConfig


logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with different LLM providers"""
    
    @staticmethod
    def get_llm(config: GradingConfig):
        """Get configured LLM instance"""
        if config.llm_provider == LLMProvider.CLAUDE:
            model = config.model_name or "claude-3-5-sonnet-20241022"
            logger.debug("Configuring Claude LLM with model=%s", model)
            return ChatAnthropic(
                model=model,
                anthropic_api_key=config.api_key,
                max_tokens=4096,
                temperature=0
            )
        elif config.llm_provider == LLMProvider.OPENAI:
            model = config.model_name or "gpt-3.5-turbo"  # Change this line
            logger.debug("Configuring OpenAI LLM with model=%s", model)
            return ChatOpenAI(
                model=model,
                openai_api_key=config.api_key,
                max_tokens=4096,
                temperature=0
            )
        else:
            logger.error("Unsupported LLM provider: %s", config.llm_provider)
            raise ValueError(f"Unsupported LLM provider: {config.llm_provider}")
    
    @staticmethod
    async def call_llm(
        config: GradingConfig,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """
        Call LLM with system and user prompts
        
        Args:
            config: Grading configuration with LLM settings
            system_prompt: System instruction
            user_prompt: User query
            
        Returns:
            LLM response as string
        """
        logger.info(
            "Calling LLM provider=%s model=%s system_prompt_len=%d user_prompt_len=%d",
            config.llm_provider,
            config.model_name or "default",
            len(system_prompt),
            len(user_prompt),
        )
        try:
            llm = LLMService.get_llm(config)

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            response = await llm.ainvoke(messages)
            logger.debug("LLM call succeeded with response length=%d", len(response.content))
            return response.content
        except Exception:
            logger.exception("LLM call failed provider=%s model=%s", config.llm_provider, config.model_name or "default")
            raise
