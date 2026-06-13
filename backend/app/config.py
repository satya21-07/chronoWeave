from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Use PostgreSQL by default (matches docker-compose service "db").
    # In production Render provides DATABASE_URL via managed database and will override this.
    DATABASE_URL: str = "postgresql+asyncpg://flowboard:flowboard@db:5432/flowboard"
    SECRET_KEY: str = "flowboard-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour

    class Config:
        env_file = ".env"


settings = Settings()
