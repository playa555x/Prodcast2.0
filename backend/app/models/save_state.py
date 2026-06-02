"""Cloud-Save: ein serialisierter Spielstand-Blob pro Player (versioniert)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SaveState(Base):
    __tablename__ = "save_states"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("players.id", ondelete="CASCADE"), unique=True, index=True
    )
    # Schema-Version des Save-Blobs (für Client-seitige Migrationen).
    version: Mapped[int] = mapped_column(Integer, default=1)
    # Roher JSON-String (Client ist die Quelle der Wahrheit über die Struktur).
    data: Mapped[str] = mapped_column(Text, default="{}")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
