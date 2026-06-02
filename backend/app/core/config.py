"""Anwendungs-Konfiguration via pydantic-settings (alle Werte aus Umgebung/.env)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Verzeichnis-Wurzel des Backends (…/backend)
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "Heart & Match Backend"
    ENVIRONMENT: str = "development"
    CONTENT_TIER: str = "sfw"  # "sfw" | "adult" — nur Metadaten/Defaults, keine Inhalte

    # --- Auth ---
    JWT_SECRET: str = "dev-insecure-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 Tage (mobile Sessions)

    # --- Datenbank ---
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'heartmatch.db'}"

    # --- ComfyUI ---
    COMFYUI_BASE_URL: str = "http://127.0.0.1:8188"
    COMFYUI_TIMEOUT_SECONDS: float = 180.0
    COMFYUI_POLL_INTERVAL_SECONDS: float = 1.0
    COMFYUI_MAX_QUEUE: int = 8
    COMFYUI_WORKFLOW_TEMPLATE: str = str(BASE_DIR / "workflows" / "portrait_template.json")

    # --- Cache / Storage ---
    CACHE_DIR: str = str(BASE_DIR / "generated_cache")

    @property
    def cache_path(self) -> Path:
        p = Path(self.CACHE_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
