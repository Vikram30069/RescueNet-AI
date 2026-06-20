"""
RescueNet AI — Application Configuration
Loads environment variables via Pydantic BaseSettings.
"""

from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    app_port: int = 8000
    secret_key: str = "dev-secret-key"

    # Database
    database_url: str = "postgresql://rescuenet:rescuenet@localhost:5432/rescuenet"

    # LLM Provider: openai | gemini | ollama | litellm | mock
    llm_provider: str = "mock"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"

    # Ollama (local)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # LiteLLM proxy
    litellm_base_url: str = "http://localhost:4000"
    litellm_model: str = "openai/gpt-4o"

    # AWS
    aws_region: str = "us-east-1"
    aws_bedrock_model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    # Maps
    google_maps_api_key: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:8000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
