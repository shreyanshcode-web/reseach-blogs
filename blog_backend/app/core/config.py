from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Blog API"
    DATABASE_URL: str = "sqlite+aiosqlite:///./blog.db"
    ML_DATABASE_URL: str = "sqlite+aiosqlite:///./ml_training.db"
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    GEMINI_API_KEY: str = ""
    MEDIA_ROOT: str = "./media"
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TIMELINE_TTL_SECONDS: int = 300
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TIMELINE_TOPIC: str = "timeline-events"
    KAFKA_GROUP_ID: str = "blog-timeline-service"
    TIMELINE_CACHE_ENABLED: bool = True
    TIMELINE_EVENTS_ENABLED: bool = True
    TIMELINE_CELEBRITY_THRESHOLD: int = 1000
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
