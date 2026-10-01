from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    # Server
    port: int = 8080
    frontend_url: str = "http://localhost:3000"

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # Groq (LLM)
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_max_tokens: int = 2048
    groq_temperature: float = 0.7

    # Qdrant (Vector DB)
    qdrant_api_key: str = ""
    qdrant_url: str = ""
    qdrant_collection: str = "GitHub_QnA_v2"

    # Embeddings (local via fastembed)
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/devpilot.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
