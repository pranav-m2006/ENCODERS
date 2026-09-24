import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FloodOps Chennai"
    REGION_NAME: str = "Chennai District, Tamil Nadu"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./floodops.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "floodops-super-secret-key-chennai-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "template") # anthropic | gemini | template
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    AUTO_APPROVE: bool = os.getenv("AUTO_APPROVE", "false").lower() == "true"
    USE_REAL_FEEDS: bool = os.getenv("USE_REAL_FEEDS", "false").lower() == "true"
    COORDINATOR_INTERVAL_SECONDS: int = 30
    RIVER_ALERT_THRESHOLD_M: float = 4.8  # Adyar / Chembarambakkam outflow threshold
    CENTER_LAT: float = 13.0400
    CENTER_LNG: float = 80.2100

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
