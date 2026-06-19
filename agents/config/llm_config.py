"""
RescueNet AI — LLM Configuration
Provider-agnostic LLM selector for CrewAI agents.

Priority: env var LLM_PROVIDER determines which backend is used.
Supported: openai | gemini | ollama | litellm | mock
"""

import os
from typing import Optional, Any


def get_llm() -> Optional[Any]:
    """
    Returns a LangChain-compatible LLM instance based on the LLM_PROVIDER env var.
    Returns None if provider is 'mock' (agents will skip LLM calls).
    """
    provider = os.getenv("LLM_PROVIDER", "mock").lower()

    if provider == "mock":
        # No LLM — agents use deterministic mock output
        return None

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.2,
        )

    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-1.5-pro"),
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.2,
        )

    elif provider == "ollama":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "llama3"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            temperature=0.2,
        )

    elif provider == "litellm":
        from langchain_community.chat_models import ChatLiteLLM
        return ChatLiteLLM(
            model=os.getenv("LITELLM_MODEL", "openai/gpt-4o"),
            api_base=os.getenv("LITELLM_BASE_URL", "http://localhost:4000"),
        )

    elif provider == "bedrock":
        from langchain_aws import ChatBedrock
        return ChatBedrock(
            model_id=os.getenv("AWS_BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )

    else:
        print(f"[LLM Config] Unknown provider '{provider}', falling back to mock mode.")
        return None
