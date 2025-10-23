"""
Configuration Management
Production-Ready Settings from Environment Variables
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    NO HARDCODED VALUES - Everything from .env
    """
    
    # ============================================
    # Application
    # ============================================
    
    APP_NAME: str = "GedächtnisBoost TTS Platform"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # ============================================
    # Security
    # ============================================
    
    # JWT Settings
    JWT_SECRET_KEY: str  # REQUIRED - Must be in .env
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Password Hashing
    BCRYPT_ROUNDS: int = 12
    
    # ============================================
    # Database
    # ============================================
    
    # SQLite for development, PostgreSQL for production
    DATABASE_URL: str = "sqlite:///./gedaechtnisboost.db"
    
    # Neon PostgreSQL (Production)
    NEON_DATABASE_URL: Optional[str] = None
    
    # Use Neon if available, otherwise SQLite
    @property
    def db_url(self) -> str:
        return self.NEON_DATABASE_URL or self.DATABASE_URL
    
    # ============================================
    # TTS API Keys
    # ============================================
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # Speechify
    SPEECHIFY_API_KEY: Optional[str] = None
    
    # Google Cloud
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_PROJECT_ID: Optional[str] = None
    
    # ElevenLabs
    ELEVENLABS_API_KEY: Optional[str] = None

    # Amazon Polly
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "eu-central-1"

    # Huggingface (for Chatterbox, XTTS-v2, Kokoro)
    HUGGINGFACE_TOKEN: Optional[str] = None

    # ============================================
    # Audio Enhancement (Adobe Podcast)
    # ============================================

    # Adobe Account 1 (can add more: ADOBE_EMAIL_2, etc.)
    ADOBE_EMAIL_1: Optional[str] = None
    ADOBE_PASSWORD_1: Optional[str] = None
    ADOBE_TIER_1: str = "free"  # "free" or "premium"

    # Enhancement Settings
    ENHANCEMENT_ENABLED: bool = True
    ENHANCEMENT_DEFAULT_QUALITY: str = "medium"  # "low", "medium", "high"
    ENHANCEMENT_CACHE_ENABLED: bool = True
    ENHANCEMENT_MAX_CONCURRENT: int = 2

    # ============================================
    # AI Research & Content Generation
    # ============================================

    # Anthropic Claude API (for research & script generation)
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # ============================================
    # Trending Topics APIs
    # ============================================

    # NewsAPI.org (100 requests/day free)
    NEWSAPI_KEY: Optional[str] = None

    # YouTube Data API (10k requests/day free)
    YOUTUBE_API_KEY: Optional[str] = None

    # MCP (Model Context Protocol) for YouTube & Web scraping
    MCP_YOUTUBE_ENABLED: bool = False
    MCP_WEB_SCRAPING_ENABLED: bool = False

    # Research Settings
    RESEARCH_MAX_SOURCES: int = 10
    RESEARCH_TIMEOUT_SECONDS: int = 300  # 5 minutes

    # ============================================
    # TTS Settings
    # ============================================
    
    # Rate Limits (characters per month)
    LIMIT_FREE_MONTHLY: int = 10000        # 10k chars
    LIMIT_PAID_MONTHLY: int = 1000000      # 1M chars
    LIMIT_ADMIN_MONTHLY: int = 999999999   # Unlimited
    
    # Costs (USD per character)
    COST_OPENAI: float = 0.000015
    COST_SPEECHIFY: float = 0.00002
    COST_GOOGLE_STANDARD: float = 0.000004
    COST_GOOGLE_WAVENET: float = 0.000016
    COST_ELEVENLABS: float = 0.00003
    COST_AMAZON_POLLY_NEURAL: float = 0.000016
    COST_AMAZON_POLLY_STANDARD: float = 0.000004
    COST_CHATTERBOX: float = 0.0  # Free Huggingface
    COST_XTTS_V2: float = 0.0  # Free Huggingface
    COST_KOKORO: float = 0.0  # Free Huggingface
    
    # ============================================
    # File Storage
    # ============================================
    
    UPLOAD_DIR: Path = Path("uploads")
    AUDIO_OUTPUT_DIR: Path = Path("audio_output")
    PODCAST_OUTPUT_DIR: Path = Path("podcast_output")
    
    # Max file sizes (bytes)
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # ============================================
    # CORS
    # ============================================
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://gedaechtnisboost.vercel.app"
    ]
    
    # ============================================
    # Logging
    # ============================================
    
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Path = Path("logs/app.log")
    
    # ============================================
    # Config
    # ============================================
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

# ============================================
# Create global settings instance
# ============================================

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
settings.PODCAST_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
settings.LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
