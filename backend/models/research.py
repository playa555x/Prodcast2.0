"""
Research Models - Podcast Content Research & Generation
Production-Ready AI-Powered Research System
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# ============================================
# Enums
# ============================================

class ResearchStatus(str, Enum):
    """Research job status"""
    PENDING = "pending"
    RESEARCHING = "researching"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class AudienceType(str, Enum):
    """Target audience for podcast variants"""
    YOUNG = "young"  # 15-25 Jahre
    MIDDLE_AGED = "middle_aged"  # 30-50 Jahre
    SCIENTIFIC = "scientific"  # Wissenschaftler/Experten

class CharacterType(str, Enum):
    """Podcast character types"""
    HOST = "host"  # Hauptmoderator
    GUEST = "guest"  # Gast
    LISTENER = "listener"  # Hörer (Side-Topics)

# ============================================
# Character & Persona Models
# ============================================

class PodcastCharacter(BaseModel):
    """Character definition for podcast participants"""
    id: str
    name: str
    role: CharacterType
    personality: str  # z.B. "humorvoll, neugierig, dominant"
    expertise: Optional[str] = None  # Fachgebiet
    speech_style: str  # z.B. "locker", "wissenschaftlich", "storytelling"
    dominance_level: float = Field(default=0.5, ge=0.0, le=1.0)  # 0-1, wie viel redet die Person

class ConversationSegment(BaseModel):
    """Single conversation segment in podcast"""
    segment_number: int
    speaker_id: str
    speaker_name: str
    text: str
    duration_estimate_seconds: float
    is_spontaneous: bool = False  # Spontane Abschweifung vom Thema
    topic_deviation: Optional[str] = None  # Thema der Abschweifung

# ============================================
# Research Request/Response Models
# ============================================

class ResearchRequest(BaseModel):
    """Initial research request"""
    topic: str = Field(..., min_length=3, max_length=500, description="Podcast-Thema")
    target_duration_minutes: int = Field(default=45, ge=30, le=60, description="Ziel-Dauer in Minuten")

    # Characters
    num_guests: int = Field(default=1, ge=0, le=3, description="Anzahl der Gäste")
    include_listener_topics: bool = Field(default=True, description="Hörer-Seitendiskussionen")

    # Content preferences
    include_youtube: bool = Field(default=True, description="YouTube-Videos analysieren")
    include_podcasts: bool = Field(default=True, description="Beste Podcasts analysieren")
    include_scientific: bool = Field(default=True, description="Wissenschaftliche Quellen")
    include_everyday: bool = Field(default=True, description="Alltags-Bezüge")

    # Spontaneity
    spontaneous_deviations: bool = Field(default=True, description="Spontane Abschweifungen erlauben")
    randomness_level: float = Field(default=0.3, ge=0.0, le=1.0, description="Zufälligkeit (0-1)")

class ResearchSource(BaseModel):
    """Single research source"""
    source_type: str  # "youtube", "podcast", "scientific", "web"
    title: str
    url: Optional[str] = None
    summary: str
    key_insights: List[str]
    credibility_score: float = Field(ge=0.0, le=1.0)

class ResearchResult(BaseModel):
    """Complete research results"""
    topic: str
    total_sources: int
    sources: List[ResearchSource]
    key_findings: List[str]
    suggested_structure: List[str]  # Empfohlene Podcast-Struktur
    estimated_quality_score: float = Field(ge=0.0, le=10.0)

class ScriptVariant(BaseModel):
    """One script variant for specific audience"""
    audience: AudienceType
    title: str
    description: str
    characters: List[PodcastCharacter]
    segments: List[ConversationSegment]
    total_duration_minutes: float
    word_count: int
    tone: str  # z.B. "locker und humorvoll", "wissenschaftlich präzise"
    full_script: str

class ResearchJobResponse(BaseModel):
    """Research job completion response"""
    job_id: str
    status: ResearchStatus
    topic: str

    # Research
    research_completed: bool
    research_result: Optional[ResearchResult] = None

    # Generated variants
    variants: List[ScriptVariant]

    # Recommendation
    recommended_variant: AudienceType
    recommendation_reason: str

    # Metadata
    created_at: datetime
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None

    # Output files
    output_directory: Optional[str] = None
    file_paths: Dict[str, str] = {}  # {"young": "/path/to/young.txt", ...}

class ResearchStatusResponse(BaseModel):
    """Research job status check"""
    job_id: str
    status: ResearchStatus
    progress_percent: float
    current_step: str
    error_message: Optional[str] = None

# ============================================
# SQLAlchemy ORM Models
# ============================================

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Float, Integer, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class ResearchJob(Base):
    """Research job tracking table"""
    __tablename__ = "research_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)

    # Input
    topic = Column(String(500), nullable=False)
    target_duration_minutes = Column(Integer, default=45, nullable=False)
    num_guests = Column(Integer, default=1, nullable=False)

    # Preferences
    include_youtube = Column(Boolean, default=True, nullable=False)
    include_podcasts = Column(Boolean, default=True, nullable=False)
    include_scientific = Column(Boolean, default=True, nullable=False)
    include_listener_topics = Column(Boolean, default=True, nullable=False)
    spontaneous_deviations = Column(Boolean, default=True, nullable=False)
    randomness_level = Column(Float, default=0.3, nullable=False)

    # Status
    status = Column(SQLEnum(ResearchStatus), default=ResearchStatus.PENDING, nullable=False)
    progress_percent = Column(Float, default=0.0, nullable=False)
    current_step = Column(String(200), nullable=True)

    # Results
    research_data = Column(JSON, nullable=True)  # ResearchResult as JSON
    variants_data = Column(JSON, nullable=True)  # List[ScriptVariant] as JSON
    recommended_variant = Column(SQLEnum(AudienceType), nullable=True)
    recommendation_reason = Column(Text, nullable=True)

    # Output
    output_directory = Column(String(500), nullable=True)
    file_paths = Column(JSON, nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_time_seconds = Column(Float, nullable=True)

    def __repr__(self):
        return f"<ResearchJob(id={self.id}, topic={self.topic}, status={self.status})>"
