"""
User Management API
Handles user stats, profiles, settings
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from core.database import get_db
from core.security import get_current_user_id
from core.config import settings
from models.user import User, UsageStats, UserRole

router = APIRouter(tags=["Users"])

@router.get("/stats")
async def get_user_stats(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get user statistics

    Requires authentication - returns current user's stats

    Returns:
        User stats including usage, limits, costs
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get or create usage stats
    stats = db.query(UsageStats).filter(UsageStats.user_id == user_id).first()
    if not stats:
        stats = UsageStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    # Determine monthly limit based on role
    if user.role == UserRole.ADMIN:
        monthly_limit = settings.LIMIT_ADMIN_MONTHLY
    elif user.role == UserRole.PAID:
        monthly_limit = settings.LIMIT_PAID_MONTHLY
    else:
        monthly_limit = settings.LIMIT_FREE_MONTHLY

    return {
        "userId": user.id,
        "totalCharactersUsed": stats.total_characters_used,
        "totalAudioGenerated": stats.total_audio_generated,
        "totalCostUsd": stats.total_cost_usd,
        "monthlyCharactersUsed": stats.monthly_characters_used,
        "monthlyLimit": monthly_limit,
        "remainingCharacters": max(0, monthly_limit - stats.monthly_characters_used),
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
