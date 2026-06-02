"""JWT-Auth (python-jose) + Player-Auflösung als FastAPI-Dependency.

Auth-Modell: geräte-/spielerzentriert. Ein Player wird über eine `device_id` identifiziert; der Server
gibt ein JWT mit `sub = player_id` aus. Kein Passwort nötig (typisch für casual Mobile-Games), optional
später erweiterbar.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.player import Player

_bearer = HTTPBearer(auto_error=True)


def create_access_token(player_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": player_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:  # abgelaufen, manipuliert, falsche Signatur …
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiges oder abgelaufenes Token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_player(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Player:
    payload = decode_access_token(credentials.credentials)
    player_id = payload.get("sub")
    if not player_id:
        raise HTTPException(status_code=401, detail="Token ohne Subject")
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=401, detail="Player nicht gefunden")
    return player
