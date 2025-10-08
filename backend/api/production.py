"""
Production API Endpoints
Multi-Voice Podcast Production Pipeline
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import logging
import uuid
from datetime import datetime
from pathlib import Path

from core.database import get_db
from core.security import get_current_user_data
from models.production import (
    StartProductionRequest, StartProductionResponse,
    GenerateSegmentsRequest, ProductionStatusResponse,
    TimelineUpdateRequest, ExportRequest, ExportResponse,
    ShareRequest,
    ProductionStatus, ProductionJob, VoiceAssignment
)
from models.research import ResearchJob, ResearchStatus
from services.production_service import ProductionService

logger = logging.getLogger(__name__)

router = APIRouter()

# Service instance
production_service = ProductionService()

# ============================================
# Helper Functions
# ============================================

async def execute_segment_generation(
    production_job_id: str,
    script_segments: list,
    voice_assignments: list,
    db: Session
):
    """Background task to generate audio segments"""
    try:
        job = db.query(ProductionJob).filter(ProductionJob.id == production_job_id).first()
        if not job:
            return

        job.status = ProductionStatus.GENERATING_SEGMENTS
        job.current_step = "Generating audio segments"
        job.progress_percent = 10.0
        db.commit()

        # Generate segments
        assignments = [VoiceAssignment(**a) for a in voice_assignments]
        audio_segments = await production_service.generate_segments(
            production_job_id=production_job_id,
            script_segments=script_segments,
            voice_assignments=assignments
        )

        # Create timeline
        job.progress_percent = 80.0
        job.current_step = "Creating timeline"
        db.commit()

        timeline = production_service.create_timeline(
            production_job_id=production_job_id,
            audio_segments=audio_segments
        )

        # Update job
        job.status = ProductionStatus.READY_FOR_EDITING
        job.progress_percent = 100.0
        job.current_step = "Ready for editing"
        job.segments_generated = len(audio_segments)
        job.segments_data = [seg.dict() for seg in audio_segments]
        job.timeline_data = timeline.dict()
        db.commit()

        logger.info(f"Segment generation completed: {production_job_id}")

    except Exception as e:
        logger.error(f"Segment generation failed: {e}", exc_info=True)
        job = db.query(ProductionJob).filter(ProductionJob.id == production_job_id).first()
        if job:
            job.status = ProductionStatus.FAILED
            job.error_message = str(e)
            db.commit()

# ============================================
# Production Endpoints
# ============================================

@router.post("/start", response_model=StartProductionResponse)
async def start_production(
    request: StartProductionRequest,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Start production from research results

    Creates production job and returns characters for voice assignment
    """
    user_id = user_data.get("sub")

    # Get research job
    research_job = db.query(ResearchJob).filter(
        ResearchJob.id == request.research_job_id,
        ResearchJob.user_id == user_id
    ).first()

    if not research_job:
        raise HTTPException(status_code=404, detail="Research job not found")

    if research_job.status != ResearchStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Research not completed yet")

    # Create production job
    try:
        production_job_id, characters = await production_service.create_production_from_research(
            research_job=research_job,
            selected_variant=request.selected_variant
        )

        # Save to database
        job = ProductionJob(
            id=production_job_id,
            user_id=user_id,
            research_job_id=request.research_job_id,
            selected_variant=request.selected_variant,
            status=ProductionStatus.VOICE_ASSIGNMENT,
            progress_percent=0.0,
            current_step="Waiting for voice assignments",
            total_segments=len(characters)
        )

        db.add(job)
        db.commit()

        logger.info(f"Production started: {production_job_id}")

        return StartProductionResponse(
            production_job_id=production_job_id,
            status=ProductionStatus.VOICE_ASSIGNMENT,
            research_job_id=request.research_job_id,
            selected_variant=request.selected_variant,
            characters=characters,
            message="Production created. Please assign voices to characters."
        )

    except Exception as e:
        logger.error(f"Failed to start production: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-segments")
async def generate_segments(
    request: GenerateSegmentsRequest,
    background_tasks: BackgroundTasks,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Generate audio segments with assigned voices

    Starts background job to generate TTS for all segments
    """
    user_id = user_data.get("sub")

    # Get production job
    job = db.query(ProductionJob).filter(
        ProductionJob.id == request.production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    if job.status != ProductionStatus.VOICE_ASSIGNMENT:
        raise HTTPException(
            status_code=400,
            detail=f"Production not in voice assignment stage. Current status: {job.status}"
        )

    # Get research job for script segments
    research_job = db.query(ResearchJob).filter(
        ResearchJob.id == job.research_job_id
    ).first()

    if not research_job or not research_job.variants_data:
        raise HTTPException(status_code=404, detail="Research data not found")

    # Get selected variant
    selected = next(
        (v for v in research_job.variants_data if v.get("audience") == job.selected_variant),
        None
    )

    if not selected:
        raise HTTPException(status_code=404, detail="Selected variant not found")

    script_segments = selected.get("segments", [])

    if not script_segments:
        raise HTTPException(status_code=400, detail="No segments found in script")

    # Save voice assignments
    job.voice_assignments = [a.dict() for a in request.voice_assignments]
    db.commit()

    # Start background generation
    background_tasks.add_task(
        execute_segment_generation,
        request.production_job_id,
        script_segments,
        [a.dict() for a in request.voice_assignments],
        db
    )

    return {
        "production_job_id": request.production_job_id,
        "status": "generating",
        "message": "Segment generation started. This may take several minutes."
    }

@router.get("/status/{production_job_id}", response_model=ProductionStatusResponse)
async def get_production_status(
    production_job_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Get production job status"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    return ProductionStatusResponse(
        production_job_id=job.id,
        status=job.status,
        progress_percent=job.progress_percent,
        current_step=job.current_step or "",
        segments_generated=job.segments_generated,
        total_segments=job.total_segments,
        error_message=job.error_message
    )

@router.get("/timeline/{production_job_id}")
async def get_timeline(
    production_job_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Get timeline for editing"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    if job.status not in [ProductionStatus.READY_FOR_EDITING, ProductionStatus.EDITING, ProductionStatus.COMPLETED]:
        raise HTTPException(
            status_code=400,
            detail=f"Timeline not ready yet. Current status: {job.status}"
        )

    if not job.timeline_data:
        raise HTTPException(status_code=404, detail="Timeline data not found")

    return job.timeline_data

@router.put("/timeline")
async def update_timeline(
    request: TimelineUpdateRequest,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Update timeline (after edits)"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == request.production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    # Update timeline
    job.timeline_data = request.timeline.dict()
    job.status = ProductionStatus.EDITING
    db.commit()

    return {"success": True, "message": "Timeline updated"}

@router.post("/export", response_model=ExportResponse)
async def export_podcast(
    request: ExportRequest,
    background_tasks: BackgroundTasks,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Export final podcast"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == request.production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    if not job.timeline_data:
        raise HTTPException(status_code=400, detail="Timeline not ready")

    # Export
    try:
        from models.production import Timeline

        timeline = Timeline(**job.timeline_data)

        output_path, file_size, duration = await production_service.export_final_podcast(
            production_job_id=request.production_job_id,
            timeline=timeline,
            format=request.format,
            quality=request.quality,
            normalize=request.normalize
        )

        # Update job
        job.status = ProductionStatus.COMPLETED
        job.final_audio_path = str(output_path)
        job.final_audio_url = f"/api/production/download/{request.production_job_id}"
        job.file_size_bytes = file_size
        job.duration_seconds = duration
        job.completed_at = datetime.utcnow()
        db.commit()

        return ExportResponse(
            production_job_id=request.production_job_id,
            status="completed",
            download_url=job.final_audio_url,
            file_size_bytes=file_size,
            duration_seconds=duration,
            format=request.format
        )

    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{production_job_id}")
async def download_podcast(
    production_job_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Download final podcast"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    if job.status != ProductionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Podcast not ready for download")

    if not job.final_audio_path:
        raise HTTPException(status_code=404, detail="Audio file not found")

    audio_path = Path(job.final_audio_path)

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    return FileResponse(
        path=audio_path,
        media_type="audio/mpeg",
        filename=f"podcast_{production_job_id}.mp3",
        headers={
            "Content-Disposition": f"attachment; filename=podcast_{production_job_id}.mp3"
        }
    )

@router.get("/audio/{production_job_id}/{segment_id}")
async def get_segment_audio(
    production_job_id: str,
    segment_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Get audio for specific segment"""
    user_id = user_data.get("sub")

    job = db.query(ProductionJob).filter(
        ProductionJob.id == production_job_id,
        ProductionJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")

    # Find segment
    segments = job.segments_data or []
    segment = next((s for s in segments if s.get("segment_id") == segment_id), None)

    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    audio_path = Path(segment.get("audio_path", ""))

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=audio_path,
        media_type="audio/mpeg"
    )

@router.get("/history")
async def get_production_history(
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """Get user's production history (completed podcasts)"""
    user_id = user_data.get("sub")

    try:
        # Get all completed production jobs
        jobs = db.query(ProductionJob).filter(
            ProductionJob.user_id == user_id,
            ProductionJob.status == ProductionStatus.COMPLETED
        ).order_by(ProductionJob.created_at.desc()).all()

        podcasts = []
        for job in jobs:
            podcasts.append({
                "production_job_id": job.id,
                "title": job.title or "Untitled Podcast",
                "description": job.description or "",
                "thumbnail_url": None,
                "duration_seconds": job.total_duration or 0,
                "file_size_bytes": 0,
                "download_url": f"/api/production/download/{job.id}",
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "shared_at": None,
                "shared_platforms": [],
                "view_count": 0,
                "download_count": 0,
                "status": "completed"
            })

        return {"podcasts": podcasts}
    except Exception as e:
        # Table might not exist yet - return empty list
        logger.warning(f"Could not load production history: {e}")
        return {"podcasts": []}

