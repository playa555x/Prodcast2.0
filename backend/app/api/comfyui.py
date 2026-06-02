"""ComfyUI-Proxy-Endpoints: Generierung anstoßen, Status abfragen, Bild ausliefern.

Lange Läufe werden über FastAPI-BackgroundTasks + den `GenerationJob`-Status abgewickelt. Das Backend
ist modell-agnostisch; explizite Inhalte können nur auf der externen ComfyUI-Instanz entstehen
(siehe docs/CONTENT_POLICY.md).
"""

from __future__ import annotations

import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_player
from app.models.generation_job import GenerationJob, JobStatus
from app.models.player import Player
from app.services.comfyui_client import GenerationParams
from app.services.reward_service import run_generation_job

router = APIRouter(prefix="/api/comfyui", tags=["comfyui"])


class GenerateIn(BaseModel):
    character_id: str = Field(min_length=1, max_length=64)
    tier: int = Field(default=0, ge=0)
    prompt: str = Field(default="portrait, character", max_length=2000)
    negative: str = Field(default="lowres, blurry, deformed", max_length=2000)
    seed: int = 0
    width: int = Field(default=768, ge=64, le=2048)
    height: int = Field(default=1024, ge=64, le=2048)
    steps: int = Field(default=25, ge=1, le=150)
    cfg: float = Field(default=6.5, ge=0, le=30)


class JobOut(BaseModel):
    id: str
    status: str
    character_id: str
    tier: int
    error: str | None = None


def _to_out(job: GenerationJob) -> JobOut:
    return JobOut(
        id=job.id,
        status=job.status,
        character_id=job.character_id,
        tier=job.tier,
        error=job.error,
    )


@router.post("/generate", response_model=JobOut)
def generate(
    body: GenerateIn,
    background: BackgroundTasks,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
) -> JobOut:
    params = GenerationParams(
        prompt=body.prompt,
        negative=body.negative,
        seed=body.seed,
        width=body.width,
        height=body.height,
        steps=body.steps,
        cfg=body.cfg,
    )
    # Cache-Hit über bereits abgeschlossene Jobs mit gleichem Schlüssel?
    cache_key = params.cache_key()
    existing = db.scalar(
        select(GenerationJob).where(
            GenerationJob.player_id == player.id,
            GenerationJob.cache_key == cache_key,
            GenerationJob.status == JobStatus.DONE.value,
        )
    )
    if existing:
        return _to_out(existing)

    job = GenerationJob(
        player_id=player.id,
        character_id=body.character_id,
        tier=body.tier,
        params_json=json.dumps(params.__dict__, default=str),
        cache_key=cache_key,
        status=JobStatus.QUEUED.value,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(run_generation_job, job.id)
    return _to_out(job)


@router.get("/jobs/{job_id}", response_model=JobOut)
def job_status(
    job_id: str, player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> JobOut:
    job = db.get(GenerationJob, job_id)
    if job is None or job.player_id != player.id:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    return _to_out(job)


@router.get("/image/{job_id}")
def job_image(
    job_id: str, player: Player = Depends(get_current_player), db: Session = Depends(get_db)
):
    job = db.get(GenerationJob, job_id)
    if job is None or job.player_id != player.id:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    if job.status != JobStatus.DONE.value or not job.result_path:
        raise HTTPException(status_code=409, detail=f"Bild nicht bereit (Status: {job.status})")
    return FileResponse(job.result_path, media_type="image/png")
