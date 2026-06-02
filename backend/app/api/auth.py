"""Auth-Endpoints: geräte-basierte Registrierung/Login -> JWT."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_player
from app.models.player import Player

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    device_id: str = Field(min_length=4, max_length=128)
    username: str | None = Field(default=None, max_length=64)
    content_tier: str = Field(default="sfw")


class PlayerOut(BaseModel):
    id: str
    username: str | None
    content_tier: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    player: PlayerOut


def _token_response(player: Player) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(player.id),
        player=PlayerOut(id=player.id, username=player.username, content_tier=player.content_tier),
    )


@router.post("/register", response_model=TokenResponse)
def register(body: AuthRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(Player).where(Player.device_id == body.device_id))
    if existing:
        # Idempotent: bereits registriertes Gerät bekommt einfach ein frisches Token.
        return _token_response(existing)
    player = Player(
        device_id=body.device_id,
        username=body.username,
        content_tier=body.content_tier if body.content_tier in ("sfw", "adult") else "sfw",
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return _token_response(player)


@router.post("/login", response_model=TokenResponse)
def login(body: AuthRequest, db: Session = Depends(get_db)) -> TokenResponse:
    player = db.scalar(select(Player).where(Player.device_id == body.device_id))
    if player is None:
        raise HTTPException(status_code=404, detail="Unbekanntes Gerät — bitte zuerst registrieren")
    return _token_response(player)


@router.get("/me", response_model=PlayerOut)
def me(player: Player = Depends(get_current_player)) -> PlayerOut:
    return PlayerOut(id=player.id, username=player.username, content_tier=player.content_tier)
