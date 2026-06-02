"""Reward-Logik: Unlocks verwalten + ComfyUI-Generierungsaufträge orchestrieren.

Eventualitäten (vgl. Plan B5): ComfyUI nicht erreichbar -> Job=failed mit klarer Meldung (der Client
fällt dann auf den lokalen Provider zurück); Fehler/Timeout -> Job=failed + error; Cache-Hit ->
bestehender result_path wird wiederverwendet.
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.generation_job import GenerationJob, JobStatus
from app.models.reward_unlock import RewardUnlock
from app.services.comfyui_client import ComfyUIClient, ComfyUIError, GenerationParams


# --- Unlocks ---------------------------------------------------------------
def list_unlocks(db: Session, player_id: str) -> list[RewardUnlock]:
    return list(
        db.scalars(select(RewardUnlock).where(RewardUnlock.player_id == player_id)).all()
    )


def unlock_reward(
    db: Session, player_id: str, character_id: str, tier: int, asset_ref: str | None
) -> RewardUnlock:
    """Idempotent: existiert das Unlock schon, wird es zurückgegeben."""
    existing = db.scalar(
        select(RewardUnlock).where(
            RewardUnlock.player_id == player_id,
            RewardUnlock.character_id == character_id,
            RewardUnlock.tier == tier,
        )
    )
    if existing:
        return existing
    unlock = RewardUnlock(
        player_id=player_id, character_id=character_id, tier=tier, asset_ref=asset_ref
    )
    db.add(unlock)
    db.commit()
    db.refresh(unlock)
    return unlock


# --- Generierungs-Orchestrierung ------------------------------------------
def _params_from_job(job: GenerationJob) -> GenerationParams:
    data = json.loads(job.params_json or "{}")
    return GenerationParams(
        prompt=data.get("prompt", "portrait, character"),
        negative=data.get("negative", "lowres, blurry, deformed"),
        seed=int(data.get("seed", 0)),
        width=int(data.get("width", 768)),
        height=int(data.get("height", 1024)),
        steps=int(data.get("steps", 25)),
        cfg=float(data.get("cfg", 6.5)),
        extra=data.get("extra", {}),
    )


async def run_generation_job(job_id: str, client: ComfyUIClient | None = None) -> None:
    """Background-Task: führt einen GenerationJob aus und schreibt das Ergebnis in den Cache.

    Eigene DB-Session, da als FastAPI-BackgroundTask außerhalb des Request-Scopes laufend.
    """
    client = client or ComfyUIClient()
    db = SessionLocal()
    try:
        job = db.get(GenerationJob, job_id)
        if job is None:
            return

        params = _params_from_job(job)

        # Cache-Hit? -> direkt fertig.
        cached = settings.cache_path / f"{params.cache_key()}.png"
        if cached.exists():
            _finish(db, job, str(cached))
            return

        job.status = JobStatus.RUNNING.value
        db.commit()

        try:
            image_bytes = await client.generate(params)
        except ComfyUIError as exc:
            _fail(db, job, str(exc))
            return
        except Exception as exc:  # noqa: BLE001 — defensiv: jeder Fehler -> Job=failed
            _fail(db, job, f"Unerwarteter Fehler: {exc}")
            return

        cached.write_bytes(image_bytes)
        _finish(db, job, str(cached))
    finally:
        db.close()


def _finish(db: Session, job: GenerationJob, path: str) -> None:
    job.status = JobStatus.DONE.value
    job.result_path = path
    job.error = None
    db.commit()


def _fail(db: Session, job: GenerationJob, error: str) -> None:
    job.status = JobStatus.FAILED.value
    job.error = error
    db.commit()
