"""
Audio Models - Pydantic & SQLAlchemy
Production-Ready Audio Generation Models
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from enum import Enum

# ============================================
# Enums
# ============================================

class TTSProvider(str, Enum):
    """TTS Provider types"""
    OPENAI = "openai"
    SPEECHIFY = "speechify"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    ELEVENLABS = "elevenlabs"

class AudioFormat(str, Enum):
    """Audio output formats"""
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    AAC = "aac"

class AudioStatus(str, Enum):
    """Audio generation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# ============================================
# Pydantic Models (API DTOs)
# ============================================

class AudioGenerateRequest(BaseModel):
    """Audio generation request"""
    text: str = Field(..., min_length=1, max_length=100000)
    provider: TTSProvider
    voice: str
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    format: AudioFormat = AudioFormat.MP3
    
class AudioGenerateResponse(BaseModel):
    """Audio generation response"""
    audio_id: str
    status: AudioStatus
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None
    character_count: int
    cost_usd: float
    provider: TTSProvider
    voice: str
    
    class Config:
        from_attributes = True

class VoiceInfo(BaseModel):
    """Voice information"""
    id: str
    name: str
    language: str
    gender: Optional[str] = None
    preview_url: Optional[str] = None
    description: Optional[str] = None
    is_premium: Optional[bool] = False
    price_per_token: Optional[float] = None

class ProviderInfo(BaseModel):
    """TTS Provider information"""
    provider: TTSProvider
    name: str
    available: bool
    voices: List[VoiceInfo]
    cost_per_character: float
    max_characters: int

# ============================================
# SQLAlchemy ORM Models
# ============================================

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Float, Integer, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class AudioGeneration(Base):
    """Audio generation history table"""
    __tablename__ = "audio_generations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    
    # Input
    text = Column(Text, nullable=False)
    character_count = Column(Integer, nullable=False)
    
    # Configuration
    provider = Column(SQLEnum(TTSProvider), nullable=False)
    voice = Column(String(100), nullable=False)
    speed = Column(Float, default=1.0, nullable=False)
    format = Column(SQLEnum(AudioFormat), default=AudioFormat.MP3, nullable=False)
    
    # Output
    status = Column(SQLEnum(AudioStatus), default=AudioStatus.PENDING, nullable=False)
    audio_url = Column(String(500), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Costs
    cost_usd = Column(Float, default=0.0, nullable=False)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<AudioGeneration(id={self.id}, provider={self.provider}, status={self.status})>"
