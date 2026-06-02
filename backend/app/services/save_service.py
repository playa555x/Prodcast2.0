"""Cloud-Save-Logik: Laden/Upsert eines Save-Blobs pro Player."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.save_state import SaveState


def get_save(db: Session, player_id: str) -> SaveState | None:
    return db.scalar(select(SaveState).where(SaveState.player_id == player_id))


def upsert_save(db: Session, player_id: str, version: int, data: str) -> SaveState:
    """Legt einen Save an oder aktualisiert den bestehenden (1 Save pro Player)."""
    save = get_save(db, player_id)
    if save is None:
        save = SaveState(player_id=player_id, version=version, data=data)
        db.add(save)
    else:
        save.version = version
        save.data = data
    db.commit()
    db.refresh(save)
    return save
