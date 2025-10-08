"""
User Management API
Handles user stats, profiles, settings
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from core.database import get_db
from core.security import get_current_user_id
from models.user import User

router = APIRouter(tags=["Users"])

@router.get("/stats")
async def get_user_stats(
    db: Session = Depends(get_db),
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get user statistics

    Optional authentication - returns guest stats if not authenticated

    Returns:
        User stats including usage, limits, costs
    """
    # If no user_id provided, return guest/demo stats
    if not user_id:
        return {
            "userId": "guest",
            "totalCharactersUsed": 0,
            "totalAudioGenerated": 0,
            "totalCostUsd": 0,
            "monthlyCharactersUsed": 0,
            "monthlyLimit": 10000,
            "remainingCharacters": 10000,
            "isGuest": True
        }

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {
            "userId": user_id,
            "totalCharactersUsed": 0,
            "totalAudioGenerated": 0,
            "totalCostUsd": 0,
            "monthlyCharactersUsed": 0,
            "monthlyLimit": 10000,
            "remainingCharacters": 10000,
            "isGuest": False
        }

    # TODO: Calculate real stats from usage logs
    return {
        "userId": user.id,
        "totalCharactersUsed": 0,
        "totalAudioGenerated": 0,
        "totalCostUsd": 0,
        "monthlyCharactersUsed": 0,
        "monthlyLimit": 10000 if user.role.value == "free" else 100000,
        "remainingCharacters": 10000 if user.role.value == "free" else 100000,
        "isGuest": False
    }

@router.get("/profile")
async def get_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get user profile"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
