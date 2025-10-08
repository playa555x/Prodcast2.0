"""
Podcast API Endpoints
Production-Ready Batch Audio Generation - NO MOCKS
"""

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import uuid
import asyncio
import zipfile
import re

from core.database import get_db
from core.security import get_current_user_data
from models.podcast import (
    PodcastPreviewRequest,
    PodcastPreviewResponse,
    PodcastGenerateRequest,
    PodcastGenerateResponse,
    PodcastStatusResponse,
    PodcastSegment,
    PodcastStatus,
    SegmentType
)
from models.audio import TTSProvider
from services.openai_tts import OpenAITTSService
from services.speechify_tts import SpeechifyTTSService
from services.google_tts import GoogleTTSService
from services.elevenlabs_tts import ElevenLabsTTSService

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================
# TTS Service Instances
# ============================================

openai_tts = OpenAITTSService()
speechify_tts = SpeechifyTTSService()
google_tts = GoogleTTSService()
elevenlabs_tts = ElevenLabsTTSService()

# ============================================
# In-Memory Job Storage (TODO: Use database)
# ============================================

podcast_jobs = {}

# ============================================
# Helper Functions
# ============================================

def segment_text(text: str, max_length: int = 1000) -> List[PodcastSegment]:
    """
    Segment long text into manageable chunks
    
    Splits on sentence boundaries where possible
    """
    segments = []
    
    # Split into paragraphs first
    paragraphs = text.split("\n\n")
    
    current_segment = ""
    segment_index = 1
    
    for para in paragraphs:
        # Skip empty paragraphs
        if not para.strip():
            continue
        
        # Split paragraph into sentences
        sentences = re.split(r'(?<=[.!?])\s+', para)
        
        for sentence in sentences:
            # If adding this sentence exceeds max length, save current segment
            if len(current_segment) + len(sentence) > max_length and current_segment:
                segments.append(PodcastSegment(
                    segment_number=segment_index,
                    segment_type=SegmentType.MAIN,
                    text=current_segment.strip(),
                    character_count=len(current_segment),
                    estimated_duration_seconds=len(current_segment) / 15.0
                ))
                segment_index += 1
                current_segment = ""
            
            current_segment += sentence + " "
    
    # Add remaining text
    if current_segment.strip():
        segments.append(PodcastSegment(
            segment_number=segment_index,
            segment_type=SegmentType.MAIN,
            text=current_segment.strip(),
            character_count=len(current_segment),
            estimated_duration_seconds=len(current_segment) / 15.0
        ))
    
    return segments

def get_tts_service(provider: str):
    """Get TTS service instance by provider name"""
    if provider == "openai":
        return openai_tts
    elif provider == "speechify":
        return speechify_tts
    elif provider == "google":
        return google_tts
    elif provider == "elevenlabs":
        return elevenlabs_tts
    else:
        raise ValueError(f"Unknown provider: {provider}")

# ============================================
# Podcast Endpoints
# ============================================

@router.post("/preview", response_model=PodcastPreviewResponse)
async def preview_podcast(request: PodcastPreviewRequest):
    """
    Preview podcast segmentation and cost estimate
    
    Analyzes script and returns:
    - Number of segments
    - Character count
    - Estimated duration
    - Estimated cost
    """
    logger.info(f"Podcast preview: {len(request.script_text)} characters")
    
    # Segment the text
    segments = segment_text(request.script_text)
    
    total_chars = sum(s.character_count for s in segments)
    total_duration = sum(s.estimated_duration_seconds for s in segments)
    
    # Estimate cost (using average TTS cost)
    avg_cost_per_char = 0.00002
    estimated_cost = total_chars * avg_cost_per_char
    
    return PodcastPreviewResponse(
        total_segments=len(segments),
        total_characters=total_chars,
        estimated_duration_minutes=total_duration / 60,
        estimated_cost_usd=estimated_cost,
        segments=segments
    )

@router.post("/generate", response_model=PodcastGenerateResponse)
async def generate_podcast(
    request: PodcastGenerateRequest,
    background_tasks: BackgroundTasks,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Generate podcast from script
    
    Processes script in background and returns job ID for status tracking
    """
    user_id = user_data.get("sub")
    
    logger.info(f"Podcast generation request from user {user_id}: {len(request.script_text)} chars")
    
    # Segment the text
    segments = segment_text(request.script_text)
    
    # Create job
    job_id = str(uuid.uuid4())
    
    podcast_jobs[job_id] = {
        "job_id": job_id,
        "user_id": user_id,
        "status": PodcastStatus.PENDING,
        "progress_percent": 0.0,
        "current_segment": None,
        "total_segments": len(segments),
        "completed_segments": 0,
        "download_url": None,
        "error_message": None,
        "segments": segments,
        "request": request,
        "created_at": datetime.utcnow()
    }
    
    # Start background processing
    background_tasks.add_task(process_podcast_job, job_id)
    
    total_duration = sum(s.estimated_duration_seconds for s in segments)
    
    return PodcastGenerateResponse(
        job_id=job_id,
        status=PodcastStatus.PENDING,
        total_segments=len(segments),
        estimated_duration_minutes=total_duration / 60
    )

@router.get("/status/{job_id}", response_model=PodcastStatusResponse)
async def get_podcast_status(job_id: str):
    """
    Get podcast generation job status
    """
    if job_id not in podcast_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = podcast_jobs[job_id]
    
    return PodcastStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        progress_percent=job["progress_percent"],
        current_segment=job.get("current_segment"),
        total_segments=job["total_segments"],
        completed_segments=job["completed_segments"],
        download_url=job.get("download_url"),
        error_message=job.get("error_message")
    )

@router.get("/download/{job_id}")
async def download_podcast(job_id: str):
    """
    Download completed podcast ZIP file
    """
    if job_id not in podcast_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = podcast_jobs[job_id]
    
    if job["status"] != PodcastStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Podcast not ready yet")
    
    zip_path = Path(f"podcast_output/{job_id}.zip")
    
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Podcast file not found")
    
    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename=f"podcast_{job_id}.zip"
    )

# ============================================
# Background Job Processing
# ============================================

async def process_podcast_job(job_id: str):
    """
    Process podcast generation in background
    
    Generates audio for each segment and creates ZIP file
    """
    job = podcast_jobs.get(job_id)
    
    if not job:
        logger.error(f"Job {job_id} not found")
        return
    
    try:
        job["status"] = PodcastStatus.GENERATING
        
        request = job["request"]
        segments = job["segments"]
        
        # Get TTS service
        service = get_tts_service(request.provider)
        
        if not service.is_available():
            raise Exception(f"TTS provider {request.provider} not available")
        
        # Create output directory
        output_dir = Path(f"podcast_output/{job_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate audio for each segment
        audio_files = []
        
        for i, segment in enumerate(segments):
            job["current_segment"] = segment.segment_number
            job["progress_percent"] = (i / len(segments)) * 100
            
            logger.info(f"Job {job_id}: Processing segment {i+1}/{len(segments)}")
            
            # Generate audio
            audio_path = output_dir / f"segment_{segment.segment_number:03d}.mp3"
            
            if request.provider == "google":
                await service.generate_speech(
                    text=segment.text,
                    voice=request.voice,
                    speed=request.speed,
                    output_path=audio_path
                )
            elif request.provider == "elevenlabs":
                await service.generate_speech(
                    text=segment.text,
                    voice_id=request.voice,
                    output_path=audio_path
                )
            else:
                await service.generate_speech(
                    text=segment.text,
                    voice=request.voice,
                    speed=request.speed,
                    output_path=audio_path
                )
            
            audio_files.append(audio_path)
            job["completed_segments"] = i + 1
        
        # Create ZIP file
        zip_path = Path(f"podcast_output/{job_id}.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for audio_file in audio_files:
                zipf.write(audio_file, audio_file.name)
        
        # Update job
        job["status"] = PodcastStatus.COMPLETED
        job["progress_percent"] = 100.0
        job["download_url"] = f"/api/podcast/download/{job_id}"
        
        logger.info(f"Job {job_id}: Completed successfully")
        
    except Exception as e:
        logger.error(f"Job {job_id}: Failed with error: {e}")
        job["status"] = PodcastStatus.FAILED
        job["error_message"] = str(e)
