from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Default to SQLite for maximum availability; Render will inject DATABASE_URL for Postgres.
    # This ensures the app starts even if the database is not available on startup.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./flowboard.db")
    SECRET_KEY: str = "flowboard-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour

    GROQ_API_KEY: Optional[str] = None
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT_SECONDS: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
