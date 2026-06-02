"""Live-Ops-Endpoints (Stubs/Grundlage): Remote-Config + Bestenlisten.

Bewusst schlank gehalten — erweiterbar für Events/Seasons/Battle-Pass in Phase 3.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_player
from app.models.leaderboard import LeaderboardEntry
from app.models.player import Player

router = APIRouter(prefix="/api/liveops", tags=["liveops"])


@router.get("/config")
def remote_config() -> dict:
    """Balancing-/Feature-Flags, die der Client ohne App-Update lesen kann."""
    return {
        "content_tier": settings.CONTENT_TIER,
        "energy_max": 5,
        "energy_regen_minutes": 20,
        "rounds_per_character": 5,
        "features": {
            "daily_challenge": True,
            "battle_pass": False,  # Phase 2/3
            "events": False,
        },
    }


class ScoreIn(BaseModel):
    board_id: str = Field(min_length=1, max_length=64)
    score: int = Field(ge=0)


class ScoreOut(BaseModel):
    player_id: str
    score: int
    rank: int


@router.post("/leaderboard/submit", response_model=ScoreOut)
def submit_score(
    body: ScoreIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> ScoreOut:
    entry = LeaderboardEntry(board_id=body.board_id, player_id=player.id, score=body.score)
    db.add(entry)
    db.commit()
    rank = _rank_for(db, body.board_id, body.score)
    return ScoreOut(player_id=player.id, score=body.score, rank=rank)


@router.get("/leaderboard/{board_id}", response_model=list[ScoreOut])
def top_scores(
    board_id: str, limit: int = 20, db: Session = Depends(get_db)
) -> list[ScoreOut]:
    rows = db.scalars(
        select(LeaderboardEntry)
        .where(LeaderboardEntry.board_id == board_id)
        .order_by(desc(LeaderboardEntry.score))
        .limit(limit)
    ).all()
    return [
        ScoreOut(player_id=r.player_id, score=r.score, rank=i + 1) for i, r in enumerate(rows)
    ]


def _rank_for(db: Session, board_id: str, score: int) -> int:
    # Vereinfachter Rang = Anzahl strikt besserer Scores + 1.
    count = (
        db.query(LeaderboardEntry)
        .filter(LeaderboardEntry.board_id == board_id, LeaderboardEntry.score > score)
        .count()
    )
    return count + 1
