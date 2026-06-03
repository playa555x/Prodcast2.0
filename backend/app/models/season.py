"""Battle-Pass / Saison-Fortschritt pro Player."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SeasonProgress(Base):
    __tablename__ = "season_progress"
    __table_args__ = (UniqueConstraint("player_id", "season_id", name="uq_season_player"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("players.id", ondelete="CASCADE"), index=True
    )
    season_id: Mapped[str] = mapped_column(String(64), index=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    premium: Mapped[int] = mapped_column(Integer, default=0)  # 0/1 — Premium-Track gekauft?
    claimed_json: Mapped[str] = mapped_column(Text, default="[]")  # Liste beanspruchter Tier-Indizes
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
