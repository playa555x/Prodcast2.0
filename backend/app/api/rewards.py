"""Reward-Endpoints: Galerie-/Unlock-Status abrufen und Unlocks markieren."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_player
from app.models.player import Player
from app.services import reward_service

router = APIRouter(prefix="/api/rewards", tags=["rewards"])


class UnlockIn(BaseModel):
    character_id: str = Field(min_length=1, max_length=64)
    tier: int = Field(ge=0)
    asset_ref: str | None = None


class UnlockOut(BaseModel):
    id: str
    character_id: str
    tier: int
    asset_ref: str | None
    unlocked_at: str


def _to_out(u) -> UnlockOut:
    return UnlockOut(
        id=u.id,
        character_id=u.character_id,
        tier=u.tier,
        asset_ref=u.asset_ref,
        unlocked_at=u.unlocked_at.isoformat(),
    )


@router.get("", response_model=list[UnlockOut])
def list_rewards(
    player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> list[UnlockOut]:
    return [_to_out(u) for u in reward_service.list_unlocks(db, player.id)]


@router.post("/unlock", response_model=UnlockOut)
def unlock(
    body: UnlockIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> UnlockOut:
    unlock = reward_service.unlock_reward(
        db, player.id, body.character_id, body.tier, body.asset_ref
    )
    return _to_out(unlock)
