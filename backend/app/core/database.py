"""SQLAlchemy-Setup: Engine, Session-Factory, Base, FastAPI-Dependency."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _make_engine(url: str):
    if url.startswith("sqlite"):
        # StaticPool + check_same_thread=False, damit Tests/Threads dieselbe In-Memory-/Datei-DB teilen.
        connect_args = {"check_same_thread": False}
        kwargs = {"connect_args": connect_args}
        if ":memory:" in url:
            kwargs["poolclass"] = StaticPool
        return create_engine(url, **kwargs)
    return create_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True)


engine = _make_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def init_db() -> None:
    """Erstellt alle Tabellen. Importiert die Modelle, damit sie registriert sind."""
    from app import models  # noqa: F401  (Seiteneffekt: Modelle registrieren)

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
