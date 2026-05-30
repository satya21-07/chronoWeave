from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Temporary SQLite for quick Render startup; replace with managed Postgres in production
    DATABASE_URL: str = "sqlite+aiosqlite:///./data.db"
    SECRET_KEY: str = "flowboard-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour

    class Config:
        env_file = ".env"


settings = Settings()
