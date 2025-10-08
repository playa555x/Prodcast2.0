"""
Research API Endpoints
AI-Powered Podcast Research & Script Generation
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
from models.research import (
    ResearchRequest, ResearchJobResponse, ResearchStatusResponse,
    ResearchStatus, ResearchJob, AudienceType
)
from services.research_service import PodcastResearchService

logger = logging.getLogger(__name__)

router = APIRouter()

# Service instance
research_service = PodcastResearchService()

# ============================================
# Helper Functions
# ============================================

async def execute_research_job(job_id: str, request: ResearchRequest, db: Session):
    """
    Background task to execute research job
    """
    try:
        # Update status
        job = db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.status = ResearchStatus.RESEARCHING
        job.current_step = "Performing multi-source research"
        job.progress_percent = 10.0
        db.commit()

        # Execute research
        research_result, variants, recommended, reason = await research_service.execute_research(request)

        # Update progress
        job.status = ResearchStatus.GENERATING
        job.current_step = "Saving variants to filesystem"
        job.progress_percent = 80.0
        db.commit()

        # Save to filesystem
        output_dir, file_paths = await research_service.save_variants_to_filesystem(
            job_id=job_id,
            variants=variants,
            research_result=research_result
        )

        # Update job as completed
        job.status = ResearchStatus.COMPLETED
        job.progress_percent = 100.0
        job.current_step = "Completed"
        job.research_data = research_result.model_dump()
        job.variants_data = [v.model_dump() for v in variants]
        job.recommended_variant = recommended
        job.recommendation_reason = reason
        job.output_directory = output_dir
        job.file_paths = file_paths
        job.completed_at = datetime.utcnow()
        job.processing_time_seconds = (datetime.utcnow() - job.created_at).total_seconds()
        db.commit()

        logger.info(f"Research job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Research job {job_id} failed: {e}", exc_info=True)

        # Update job as failed
        job = db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
        if job:
            job.status = ResearchStatus.FAILED
            job.error_message = str(e)
            db.commit()

# ============================================
# Research Endpoints
# ============================================

@router.post("/start", response_model=ResearchJobResponse)
async def start_research(
    request: ResearchRequest,
    background_tasks: BackgroundTasks,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Start AI-powered podcast research

    This will:
    1. Research YouTube, podcasts, scientific sources, web
    2. Analyze with Claude AI
    3. Generate 3 script variants (young, middle-aged, scientific)
    4. Save to filesystem
    5. Provide recommendation

    Returns job_id for status tracking
    """
    user_id = user_data.get("sub")

    # Check if Claude AI is available
    if not research_service.claude.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Claude AI not configured. Please set ANTHROPIC_API_KEY in .env"
        )

    logger.info(f"Starting research job for user {user_id}: {request.topic}")

    # Create job in database
    job_id = str(uuid.uuid4())
    job = ResearchJob(
        id=job_id,
        user_id=user_id,
        topic=request.topic,
        target_duration_minutes=request.target_duration_minutes,
        num_guests=request.num_guests,
        include_youtube=request.include_youtube,
        include_podcasts=request.include_podcasts,
        include_scientific=request.include_scientific,
        include_listener_topics=request.include_listener_topics,
        spontaneous_deviations=request.spontaneous_deviations,
        randomness_level=request.randomness_level,
        status=ResearchStatus.PENDING,
        progress_percent=0.0,
        current_step="Initializing"
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Start background task
    background_tasks.add_task(execute_research_job, job_id, request, db)

    return ResearchJobResponse(
        job_id=job_id,
        status=ResearchStatus.PENDING,
        topic=request.topic,
        research_completed=False,
        research_result=None,
        variants=[],
        recommended_variant=AudienceType.MIDDLE_AGED,
        recommendation_reason="Processing...",
        created_at=job.created_at,
        completed_at=None,
        processing_time_seconds=None,
        output_directory=None,
        file_paths={}
    )

@router.get("/status/{job_id}", response_model=ResearchStatusResponse)
async def get_research_status(
    job_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Get research job status

    Poll this endpoint to track progress
    """
    user_id = user_data.get("sub")

    job = db.query(ResearchJob).filter(
        ResearchJob.id == job_id,
        ResearchJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")

    return ResearchStatusResponse(
        job_id=job.id,
        status=job.status,
        progress_percent=job.progress_percent,
        current_step=job.current_step or "",
        error_message=job.error_message
    )

@router.get("/result/{job_id}", response_model=ResearchJobResponse)
async def get_research_result(
    job_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Get complete research results

    Only works when status is COMPLETED
    """
    user_id = user_data.get("sub")

    job = db.query(ResearchJob).filter(
        ResearchJob.id == job_id,
        ResearchJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")

    if job.status != ResearchStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Research not completed yet. Current status: {job.status}"
        )

    # Reconstruct response from database
    from models.research import ResearchResult, ScriptVariant

    research_result = None
    if job.research_data:
        research_result = ResearchResult(**job.research_data)

    variants = []
    if job.variants_data:
        variants = [ScriptVariant(**v) for v in job.variants_data]

    return ResearchJobResponse(
        job_id=job.id,
        status=job.status,
        topic=job.topic,
        research_completed=True,
        research_result=research_result,
        variants=variants,
        recommended_variant=job.recommended_variant,
        recommendation_reason=job.recommendation_reason or "",
        created_at=job.created_at,
        completed_at=job.completed_at,
        processing_time_seconds=job.processing_time_seconds,
        output_directory=job.output_directory,
        file_paths=job.file_paths or {}
    )

@router.get("/download/{job_id}/{file_type}")
async def download_research_file(
    job_id: str,
    file_type: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Download research script file

    file_type: "research", "young", "middle_aged", or "scientific"
    """
    user_id = user_data.get("sub")

    # Get job
    job = db.query(ResearchJob).filter(
        ResearchJob.id == job_id,
        ResearchJob.user_id == user_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")

    if job.status != ResearchStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Research not completed yet")

    # Get file path
    if not job.file_paths or file_type not in job.file_paths:
        raise HTTPException(status_code=404, detail=f"File type '{file_type}' not found")

    file_path = Path(job.file_paths[file_type])

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Return file
    return FileResponse(
        path=file_path,
        media_type="text/plain",
        filename=file_path.name,
        headers={
            "Content-Disposition": f"attachment; filename={file_path.name}"
        }
    )
