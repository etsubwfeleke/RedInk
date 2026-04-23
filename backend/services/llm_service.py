from typing import Dict, Any, Optional
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from models.schemas import LLMProvider, GradingConfig


class LLMService:
    """Service for interacting with different LLM providers"""
    
    @staticmethod
    def get_llm(config: GradingConfig):
        """Get configured LLM instance"""
        if config.llm_provider == LLMProvider.CLAUDE:
            model = config.model_name or "claude-3-5-sonnet-20241022"
            return ChatAnthropic(
                model=model,
                anthropic_api_key=config.api_key,
                max_tokens=4096,
                temperature=0
            )
        elif config.llm_provider == LLMProvider.OPENAI:
            model = config.model_name or "gpt-3.5-turbo"  # Change this line
            return ChatOpenAI(
                model=model,
                openai_api_key=config.api_key,
                max_tokens=4096,
                temperature=0
            )
        else:
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
        llm = LLMService.get_llm(config)
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = await llm.ainvoke(messages)
        return response.content
