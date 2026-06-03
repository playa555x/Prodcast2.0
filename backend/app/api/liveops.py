"""Live-Ops-Endpoints: Remote-Config, Events (Phasen-Modell), Battle-Pass/Saison,
Bestenlisten und Feature-Flags. Folgt docs/RESEARCH_MODES.md (Content + per-Player-State,
serverseitig aufgelöste Phase, generisch vom Client renderbar)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_player
from app.models.leaderboard import LeaderboardEntry
from app.models.player import Player
from app.models.season import SeasonProgress

router = APIRouter(prefix="/api/liveops", tags=["liveops"])


# ---------------------------------------------------------------- Remote-Config
@router.get("/config")
def remote_config() -> dict:
    """Balancing-/Feature-Flags, die der Client ohne App-Update liest (mit Safe-Defaults im Client)."""
    return {
        "content_tier": settings.CONTENT_TIER,
        "energy_max": 5,
        "energy_regen_minutes": 20,
        "rounds_per_character": 5,
        "features": {"daily_challenge": True, "battle_pass": True, "events": True},
    }


@router.get("/flags")
def flags(player: Player = Depends(get_current_player)) -> dict:
    """Feature-Flags / Dark-Shipping. Server entscheidet, was der Client anzeigt."""
    return {
        "mode_endless": True,
        "mode_timeattack": True,
        "mode_daily": True,
        "event_pinata": True,
        "battle_pass": True,
        "teams": False,  # dark-shipped (Phase 3)
        "pvp_race": False,
    }


# ------------------------------------------------------------------------ Events
def _phase(now: datetime, start: datetime, end: datetime, soon_h: int = 6) -> str:
    if now < start:
        return "Preview"
    if now >= end:
        return "Concluded"
    if end - now <= timedelta(hours=soon_h):
        return "EndingSoon"
    return "NormalActive"


def _build_events(now: datetime) -> list[dict]:
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    # Piñata: rollierender 3-Tage-Zyklus ab fester Epoche
    anchor = datetime(2026, 1, 1, tzinfo=timezone.utc)
    cycle = timedelta(days=3)
    n = (now - anchor) // cycle
    p_start = anchor + n * cycle
    p_end = p_start + cycle
    return [
        {
            "eventId": "daily-" + day_start.strftime("%Y%m%d"),
            "type": "Daily", "modeId": "daily", "template": "daily_challenge",
            "phase": _phase(now, day_start, day_end),
            "startUtc": day_start.isoformat(), "endUtc": day_end.isoformat(),
            "rewardTableId": "rt_daily", "config": {"target": 1000, "moves": 25},
        },
        {
            "eventId": "pinata-" + p_start.strftime("%Y%m%d"),
            "type": "Timed", "modeId": "story", "template": "step_event",
            "phase": _phase(now, p_start, p_end),
            "startUtc": p_start.isoformat(), "endUtc": p_end.isoformat(),
            "rewardTableId": "rt_pinata",
            "config": {"steps": 3, "goalPerStep": 30, "collect": "candy"},
        },
    ]


@router.get("/events")
def events(player: Player = Depends(get_current_player)) -> dict:
    now = datetime.now(timezone.utc)
    return {"serverTimeUtc": now.isoformat(), "events": _build_events(now)}


# ------------------------------------------------------------- Battle-Pass / Saison
def _season_id(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return f"{now.year}-{now.month:02d}"


# Track-Definition (Content). 10 Stufen, frei + Premium.
def _season_tiers() -> list[dict]:
    tiers = []
    for i in range(10):
        tiers.append({
            "tier": i,
            "points": (i + 1) * 100,
            "free": {"itemId": "coins", "qty": 100 + i * 20},
            "premium": {"itemId": "gems" if i % 2 else "coins", "qty": 10 + i * 5 if i % 2 else 300 + i * 40},
        })
    return tiers


def _get_progress(db: Session, player_id: str) -> SeasonProgress:
    sid = _season_id()
    sp = db.scalar(select(SeasonProgress).where(SeasonProgress.player_id == player_id, SeasonProgress.season_id == sid))
    if sp is None:
        sp = SeasonProgress(player_id=player_id, season_id=sid, points=0)
        db.add(sp); db.commit(); db.refresh(sp)
    return sp


class PointsIn(BaseModel):
    points: int = Field(ge=0, le=1000)


class ClaimIn(BaseModel):
    tier: int = Field(ge=0)
    track: str = Field(default="free")  # "free" | "premium"


@router.get("/season")
def season(player: Player = Depends(get_current_player), db: Session = Depends(get_db)) -> dict:
    sp = _get_progress(db, player.id)
    return {
        "seasonId": sp.season_id, "points": sp.points, "premium": bool(sp.premium),
        "claimed": json.loads(sp.claimed_json or "[]"), "tiers": _season_tiers(),
    }


@router.post("/season/add")
def season_add(body: PointsIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)) -> dict:
    sp = _get_progress(db, player.id)
    sp.points += body.points
    db.commit()
    return {"points": sp.points}


@router.post("/season/claim")
def season_claim(body: ClaimIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)) -> dict:
    sp = _get_progress(db, player.id)
    tiers = _season_tiers()
    if body.tier >= len(tiers):
        raise HTTPException(status_code=400, detail="Ungültige Stufe")
    tier = tiers[body.tier]
    if sp.points < tier["points"]:
        raise HTTPException(status_code=409, detail="Stufe noch nicht erreicht")
    if body.track == "premium" and not sp.premium:
        raise HTTPException(status_code=402, detail="Premium-Track nicht freigeschaltet")
    key = f"{body.track}:{body.tier}"
    claimed = json.loads(sp.claimed_json or "[]")
    if key in claimed:
        raise HTTPException(status_code=409, detail="Bereits beansprucht")
    claimed.append(key)
    sp.claimed_json = json.dumps(claimed)
    db.commit()
    return {"reward": tier[body.track], "claimed": claimed}


@router.post("/season/unlock-premium")
def season_unlock_premium(player: Player = Depends(get_current_player), db: Session = Depends(get_db)) -> dict:
    sp = _get_progress(db, player.id)
    sp.premium = 1
    db.commit()
    return {"premium": True}


# ------------------------------------------------------------------- Leaderboard
class ScoreIn(BaseModel):
    board_id: str = Field(min_length=1, max_length=64)
    score: int = Field(ge=0)


class ScoreOut(BaseModel):
    player_id: str
    score: int
    rank: int


@router.post("/leaderboard/submit", response_model=ScoreOut)
def submit_score(body: ScoreIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)) -> ScoreOut:
    db.add(LeaderboardEntry(board_id=body.board_id, player_id=player.id, score=body.score))
    db.commit()
    return ScoreOut(player_id=player.id, score=body.score, rank=_rank_for(db, body.board_id, body.score))


@router.get("/leaderboard/{board_id}", response_model=list[ScoreOut])
def top_scores(board_id: str, limit: int = 20, db: Session = Depends(get_db)) -> list[ScoreOut]:
    rows = db.scalars(
        select(LeaderboardEntry).where(LeaderboardEntry.board_id == board_id)
        .order_by(desc(LeaderboardEntry.score)).limit(limit)
    ).all()
    return [ScoreOut(player_id=r.player_id, score=r.score, rank=i + 1) for i, r in enumerate(rows)]


def _rank_for(db: Session, board_id: str, score: int) -> int:
    count = (
        db.query(LeaderboardEntry)
        .filter(LeaderboardEntry.board_id == board_id, LeaderboardEntry.score > score)
        .count()
    )
    return count + 1
