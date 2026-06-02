"""Freigeschaltete Belohnungen pro Player/Charakter/Tier (für Galerie & Cloud-Sync)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RewardUnlock(Base):
    __tablename__ = "reward_unlocks"
    __table_args__ = (
        UniqueConstraint("player_id", "character_id", "tier", name="uq_unlock_player_char_tier"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("players.id", ondelete="CASCADE"), index=True
    )
    character_id: Mapped[str] = mapped_column(String(64), index=True)
    tier: Mapped[int] = mapped_column(Integer)
    # Referenz auf das ausgelieferte Asset (lokaler Pfad, Cache-Key oder Generation-Job-Id).
    asset_ref: Mapped[str | None] = mapped_column(String(256), nullable=True)
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
