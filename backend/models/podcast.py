"""
Podcast Models - Pydantic & SQLAlchemy
Production-Ready Podcast Generation Models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# ============================================
# Enums
# ============================================

class PodcastStatus(str, Enum):
    """Podcast generation status"""
    PENDING = "pending"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class SegmentType(str, Enum):
    """Podcast segment types"""
    INTRO = "intro"
    MAIN = "main"
    OUTRO = "outro"
    TRANSITION = "transition"

# ============================================
# Pydantic Models (API DTOs)
# ============================================

class PodcastSegment(BaseModel):
    """Individual podcast segment"""
    segment_number: int
    segment_type: SegmentType
    text: str
    character_count: int
    estimated_duration_seconds: float

class PodcastPreviewRequest(BaseModel):
    """Podcast preview/analysis request"""
    script_text: str = Field(..., min_length=100, max_length=500000)
    
class PodcastPreviewResponse(BaseModel):
    """Podcast preview response"""
    total_segments: int
    total_characters: int
    estimated_duration_minutes: float
    estimated_cost_usd: float
    segments: List[PodcastSegment]

class PodcastGenerateRequest(BaseModel):
    """Podcast generation request"""
    script_text: str = Field(..., min_length=100, max_length=500000)
    provider: str
    voice: str
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    include_intro: bool = True
    include_outro: bool = True
    
class PodcastGenerateResponse(BaseModel):
    """Podcast generation response"""
    job_id: str
    status: PodcastStatus
    total_segments: int
    estimated_duration_minutes: float
    
class PodcastStatusResponse(BaseModel):
    """Podcast job status response"""
    job_id: str
    status: PodcastStatus
    progress_percent: float
    current_segment: Optional[int] = None
    total_segments: int
    completed_segments: int
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

# ============================================
# SQLAlchemy ORM Models
# ============================================

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Float, Integer, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class PodcastJob(Base):
    """Podcast generation job table"""
    __tablename__ = "podcast_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    
    # Input
    script_text = Column(Text, nullable=False)
    total_characters = Column(Integer, nullable=False)
    
    # Configuration
    provider = Column(String(50), nullable=False)
    voice = Column(String(100), nullable=False)
    speed = Column(Float, default=1.0, nullable=False)
    include_intro = Column(Boolean, default=True, nullable=False)
    include_outro = Column(Boolean, default=True, nullable=False)
    
    # Status
    status = Column(SQLEnum(PodcastStatus), default=PodcastStatus.PENDING, nullable=False)
    progress_percent = Column(Float, default=0.0, nullable=False)
    current_segment = Column(Integer, nullable=True)
    total_segments = Column(Integer, nullable=False)
    completed_segments = Column(Integer, default=0, nullable=False)
    
    # Output
    download_url = Column(String(500), nullable=True)
    zip_file_path = Column(String(500), nullable=True)
    total_duration_seconds = Column(Float, nullable=True)
    total_cost_usd = Column(Float, default=0.0, nullable=False)
    
    # Segments data (JSON)
    segments_data = Column(JSON, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<PodcastJob(id={self.id}, status={self.status}, progress={self.progress_percent}%)>"
