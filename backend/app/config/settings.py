"""
Application settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration from environment variables."""

    # App
    app_name: str = "Inbound Calling Agent API"
    debug: bool = False
    api_base_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    # Database
    database_url: str = "sqlite+aiosqlite:///./local.db"  # Defaults to local SQLite if not set

    # LLM - Cerebras
    cerebras_api_key: str = ""

    # Embeddings - OpenAI
    openai_api_key: str = ""

    # Vector Database - Pinecone
    pinecone_api_key: str = ""
    pinecone_index: str = "calling-agent-kb"

    # Speech-to-Text - Whisper
    whisper_api_key: str = ""

    # Text-to-Speech - DeepGram
    deepgram_api_key: str = ""

    # Telephony - Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Map env var names to field names
        fields = {
            "database_url": {"env": "DATABASE_URL"},
        }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
