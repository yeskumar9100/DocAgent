from __future__ import annotations
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Security
    secret_key: str = Field(..., description="Fernet key for encrypting stored API keys")

    # Database
    database_url: str = "sqlite+aiosqlite:///./docagent.db"

    # Default provider
    nvidia_api_key: str = ""

    # Optional providers (pre-loaded if set in .env)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # File storage
    faiss_index_dir: str = "./faiss_indexes"
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 25

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def faiss_index_path(self) -> Path:
        p = Path(self.faiss_index_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()
