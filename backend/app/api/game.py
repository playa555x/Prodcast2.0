"""Cloud-Save-Endpoints: Spielstand laden/speichern."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_player
from app.models.player import Player
from app.services import save_service

router = APIRouter(prefix="/api/game", tags=["game"])


class SaveIn(BaseModel):
    version: int = Field(default=1, ge=1)
    # Frei strukturierter Save-Blob; der Client ist Quelle der Wahrheit über das Schema.
    data: dict


class SaveOut(BaseModel):
    version: int
    data: dict
    updated_at: str


@router.get("/save", response_model=SaveOut | None)
def load_save(
    player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> SaveOut | None:
    save = save_service.get_save(db, player.id)
    if save is None:
        return None
    return SaveOut(
        version=save.version, data=json.loads(save.data or "{}"), updated_at=save.updated_at.isoformat()
    )


@router.put("/save", response_model=SaveOut)
def store_save(
    body: SaveIn, player: Player = Depends(get_current_player), db: Session = Depends(get_db)
) -> SaveOut:
    try:
        data_str = json.dumps(body.data)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Save-Daten nicht serialisierbar: {exc}") from exc
    save = save_service.upsert_save(db, player.id, body.version, data_str)
    return SaveOut(
        version=save.version, data=body.data, updated_at=save.updated_at.isoformat()
    )
