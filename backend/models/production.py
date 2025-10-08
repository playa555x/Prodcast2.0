"""
Production Models - Multi-Voice Podcast Production Pipeline
Timeline Editor, Voice Assignment, Final Export
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# ============================================
# Enums
# ============================================

class ProductionStatus(str, Enum):
    """Production pipeline status"""
    VOICE_ASSIGNMENT = "voice_assignment"  # Waiting for voice assignments
    GENERATING_SEGMENTS = "generating_segments"  # TTS generation in progress
    READY_FOR_EDITING = "ready_for_editing"  # Segments ready, can edit
    EDITING = "editing"  # User is editing in timeline
    EXPORTING = "exporting"  # Finalizing/merging audio
    COMPLETED = "completed"  # Final podcast ready
    FAILED = "failed"

class SegmentType(str, Enum):
    """Audio segment types"""
    SPEECH = "speech"  # Voice segment
    MUSIC = "music"  # Background music
    SFX = "sfx"  # Sound effect
    SILENCE = "silence"  # Pause/silence

# ============================================
# Voice Assignment Models
# ============================================

class VoiceAssignment(BaseModel):
    """Assign voice to character"""
    character_id: str
    character_name: str
    provider: str  # TTSProvider
    voice_id: str
    voice_name: str

class VoiceAssignmentRequest(BaseModel):
    """Voice assignment for all characters"""
    research_job_id: str
    selected_variant: str  # "young", "middle_aged", "scientific"
    assignments: List[VoiceAssignment]

# ============================================
# Audio Segment Models
# ============================================

class AudioSegment(BaseModel):
    """Single audio segment in timeline"""
    segment_id: str
    segment_number: int
    segment_type: SegmentType

    # Speech segments
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    text: Optional[str] = None
    voice_id: Optional[str] = None
    voice_name: Optional[str] = None
    provider: Optional[str] = None

    # Audio properties
    speed: float = 1.0
    pitch: Optional[float] = None  # -1.0 to 1.0
    volume: float = 1.0  # 0.0 to 1.0
    emotion: Optional[str] = None  # "neutral", "happy", "sad", "angry"

    # Timing
    start_time: float = 0.0  # seconds
    duration: float = 0.0  # seconds
    end_time: float = 0.0  # seconds

    # Files
    audio_url: Optional[str] = None
    audio_path: Optional[str] = None
    waveform_url: Optional[str] = None

    # Music/SFX specific
    file_name: Optional[str] = None
    loop: bool = False
    fade_in: float = 0.0
    fade_out: float = 0.0

    # Status
    status: str = "pending"  # "pending", "generating", "ready", "error"
    error_message: Optional[str] = None

class TimelineTrack(BaseModel):
    """Timeline track (like in video editor)"""
    track_id: str
    track_name: str
    track_type: str  # "speech", "music", "sfx"
    track_number: int
    segments: List[AudioSegment]
    muted: bool = False
    solo: bool = False
    volume: float = 1.0

class Timeline(BaseModel):
    """Complete timeline for editing"""
    production_job_id: str
    total_duration: float  # seconds
    tracks: List[TimelineTrack]
    sample_rate: int = 44100
    bit_depth: int = 16

# ============================================
# Production Request/Response Models
# ============================================

class StartProductionRequest(BaseModel):
    """Start production from research results"""
    research_job_id: str
    selected_variant: str  # "young", "middle_aged", "scientific"

class StartProductionResponse(BaseModel):
    """Production job created"""
    production_job_id: str
    status: ProductionStatus
    research_job_id: str
    selected_variant: str
    characters: List[Dict]  # Characters that need voice assignment
    message: str

class GenerateSegmentsRequest(BaseModel):
    """Generate audio for all segments"""
    production_job_id: str
    voice_assignments: List[VoiceAssignment]

class ProductionStatusResponse(BaseModel):
    """Production status"""
    production_job_id: str
    status: ProductionStatus
    progress_percent: float
    current_step: str
    segments_generated: int
    total_segments: int
    error_message: Optional[str] = None

class TimelineUpdateRequest(BaseModel):
    """Update timeline (edit segments)"""
    production_job_id: str
    timeline: Timeline

class ExportRequest(BaseModel):
    """Export final podcast"""
    production_job_id: str
    format: str = "mp3"  # "mp3", "wav"
    quality: str = "high"  # "low", "medium", "high"
    normalize: bool = True
    add_metadata: bool = True
    metadata: Optional[Dict[str, str]] = None

class ExportResponse(BaseModel):
    """Export result"""
    production_job_id: str
    status: str
    download_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    format: str

class ShareRequest(BaseModel):
    """Share podcast"""
    production_job_id: str
    platforms: List[str]  # ["twitter", "facebook", "youtube", etc.]
    title: str
    description: Optional[str] = None
    tags: List[str] = []

# ============================================
# Voice Library Models
# ============================================

class VoiceLibraryEntry(BaseModel):
    """Voice library entry with preview"""
    voice_id: str
    voice_name: str
    provider: str
    language: Optional[str] = None
    gender: Optional[str] = None
    preview_text: str
    preview_url: Optional[str] = None
    usage_count: int = 0
    last_used: Optional[datetime] = None
    tags: List[str] = []
    favorite: bool = False

# ============================================
# History Models
# ============================================

class HistoryEntry(BaseModel):
    """Podcast history entry"""
    production_job_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: float
    file_size_bytes: int
    download_url: str
    created_at: datetime
    shared_at: Optional[datetime] = None
    shared_platforms: List[str] = []
    view_count: int = 0
    download_count: int = 0
    status: str  # "draft", "published", "archived"

# ============================================
# SQLAlchemy ORM Models
# ============================================

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Float, Integer, Text, Boolean, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class ProductionJob(Base):
    """Production job table"""
    __tablename__ = "production_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    research_job_id = Column(String(36), nullable=False, index=True)

    # Selected variant
    selected_variant = Column(String(20), nullable=False)  # "young", "middle_aged", "scientific"

    # Status
    status = Column(SQLEnum(ProductionStatus), default=ProductionStatus.VOICE_ASSIGNMENT, nullable=False)
    progress_percent = Column(Float, default=0.0, nullable=False)
    current_step = Column(String(200), nullable=True)

    # Voice assignments (JSON)
    voice_assignments = Column(JSON, nullable=True)

    # Timeline (JSON)
    timeline_data = Column(JSON, nullable=True)

    # Segments
    total_segments = Column(Integer, default=0, nullable=False)
    segments_generated = Column(Integer, default=0, nullable=False)
    segments_data = Column(JSON, nullable=True)

    # Export
    final_audio_url = Column(String(500), nullable=True)
    final_audio_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Sharing
    shared_at = Column(DateTime(timezone=True), nullable=True)
    shared_platforms = Column(JSON, nullable=True)

    # Metadata
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<ProductionJob(id={self.id}, status={self.status}, progress={self.progress_percent}%)>"

class VoiceLibrary(Base):
    """Voice library table"""
    __tablename__ = "voice_library"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)

    voice_id = Column(String(100), nullable=False)
    voice_name = Column(String(200), nullable=False)
    provider = Column(String(50), nullable=False)
    language = Column(String(10), nullable=True)
    gender = Column(String(20), nullable=True)

    preview_text = Column(Text, nullable=False)
    preview_url = Column(String(500), nullable=True)
    preview_path = Column(String(500), nullable=True)

    usage_count = Column(Integer, default=0, nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)

    tags = Column(JSON, nullable=True)
    favorite = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VoiceLibrary(id={self.id}, voice={self.voice_name}, provider={self.provider})>"

class PodcastHistory(Base):
    """Podcast history table"""
    __tablename__ = "podcast_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    production_job_id = Column(String(36), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)

    duration_seconds = Column(Float, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    download_url = Column(String(500), nullable=False)

    status = Column(String(20), default="draft", nullable=False)  # draft, published, archived

    shared_at = Column(DateTime(timezone=True), nullable=True)
    shared_platforms = Column(JSON, nullable=True)

    view_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    def __repr__(self):
        return f"<PodcastHistory(id={self.id}, title={self.title})>"
