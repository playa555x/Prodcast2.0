"""
Voice Library API
Manage used voices, previews, favorites
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from core.database import get_db
from core.security import get_current_user_id

router = APIRouter(prefix="/api/voice-library", tags=["Voice Library"])

@router.get("/list")
async def get_voice_library(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get user's voice library (all used voices)

    Returns:
        List of voice entries with usage stats
    """
    # TODO: Query actual voice usage from production jobs
    # For now, return empty list
    return {"voices": []}
