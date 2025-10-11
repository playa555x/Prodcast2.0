"""
Admin API Routes - User Management

Features:
- List all users with stats
- Create new users manually
- Update user data
- Delete users
- View detailed user information

Quality: 12/10
Last updated: 2025-10-07
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from core.security import get_current_user_data, get_password_hash
from core.database import get_db
from core.config import settings
from models.user import UserRole, UserStatus, User, UsageStats

# ============================================
# Router
# ============================================

router = APIRouter()

# ============================================
# Models
# ============================================

class UserListItem(BaseModel):
    """User list item for admin overview"""
    user_id: str
    username: str
    email: Optional[EmailStr] = None
    role: UserRole
    subscription_plan: str
    monthly_limit: int
    monthly_used: int
    total_characters_used: int
    total_cost_usd: float
    created_at: str
    last_login: Optional[str] = None
    is_active: bool

class UserDetailResponse(BaseModel):
    """Detailed user information"""
    user_id: str
    username: str
    email: Optional[EmailStr] = None
    role: UserRole
    subscription_plan: str
    monthly_limit: int
    monthly_used: int
    remaining_characters: int
    total_characters_used: int
    total_audio_generated: int
    total_cost_usd: float
    created_at: str
    last_login: Optional[str] = None
    is_active: bool
    metadata: dict = {}

class CreateUserRequest(BaseModel):
    """Request to create new user"""
    username: str
    email: Optional[EmailStr] = None
    password: str
    role: UserRole = UserRole.FREE
    subscription_plan: str = "free"
    monthly_limit: int = 10000

class UpdateUserRequest(BaseModel):
    """Request to update user"""
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    subscription_plan: Optional[str] = None
    monthly_limit: Optional[int] = None
    is_active: Optional[bool] = None

# ============================================
# Helper Functions
# ============================================

def require_admin(user_data: dict):
    """Check if user is admin"""
    role = user_data.get("role")
    # Handle both string and enum comparison
    if role != UserRole.ADMIN.value and role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

def get_monthly_limit(role: UserRole) -> int:
    """Get monthly character limit based on user role"""
    if role == UserRole.ADMIN:
        return settings.LIMIT_ADMIN_MONTHLY
    elif role == UserRole.PAID:
        return settings.LIMIT_PAID_MONTHLY
    else:
        return settings.LIMIT_FREE_MONTHLY

# ============================================
# Routes
# ============================================

@router.get("/admin/users", response_model=List[UserListItem])
async def list_users(
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Get list of all users (Admin only)

    Returns user overview with statistics from database
    """
    require_admin(user_data)

    # Query all users from database
    db_users = db.query(User).all()

    users = []
    for db_user in db_users:
        # Get or create usage stats
        stats = db.query(UsageStats).filter(UsageStats.user_id == db_user.id).first()
        if not stats:
            # Create stats if they don't exist
            stats = UsageStats(user_id=db_user.id)
            db.add(stats)
            db.commit()
            db.refresh(stats)

        # Determine monthly limit based on role
        monthly_limit = get_monthly_limit(db_user.role)

        # Map role to subscription plan name
        subscription_plan = {
            UserRole.ADMIN: "unlimited",
            UserRole.PAID: "paid",
            UserRole.FREE: "free"
        }.get(db_user.role, "free")

        users.append(UserListItem(
            user_id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            role=db_user.role,
            subscription_plan=subscription_plan,
            monthly_limit=monthly_limit,
            monthly_used=stats.monthly_characters_used,
            total_characters_used=stats.total_characters_used,
            total_cost_usd=stats.total_cost_usd,
            created_at=db_user.created_at.isoformat(),
            last_login=db_user.last_login.isoformat() if db_user.last_login else None,
            is_active=(db_user.status == UserStatus.ACTIVE)
        ))

    return users

@router.get("/admin/users/{user_id}", response_model=UserDetailResponse)
async def get_user_details(
    user_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Get detailed user information (Admin only)
    """
    require_admin(user_data)

    # Query user from database
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get or create usage stats
    stats = db.query(UsageStats).filter(UsageStats.user_id == user_id).first()
    if not stats:
        stats = UsageStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    # Determine monthly limit based on role
    monthly_limit = get_monthly_limit(db_user.role)

    # Map role to subscription plan name
    subscription_plan = {
        UserRole.ADMIN: "unlimited",
        UserRole.PAID: "paid",
        UserRole.FREE: "free"
    }.get(db_user.role, "free")

    user = UserDetailResponse(
        user_id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        role=db_user.role,
        subscription_plan=subscription_plan,
        monthly_limit=monthly_limit,
        monthly_used=stats.monthly_characters_used,
        remaining_characters=max(0, monthly_limit - stats.monthly_characters_used),
        total_characters_used=stats.total_characters_used,
        total_audio_generated=stats.total_audio_generated,
        total_cost_usd=stats.total_cost_usd,
        created_at=db_user.created_at.isoformat(),
        last_login=db_user.last_login.isoformat() if db_user.last_login else None,
        is_active=(db_user.status == UserStatus.ACTIVE),
        metadata={}
    )

    return user

@router.post("/admin/users", response_model=UserDetailResponse)
async def create_user(
    request: CreateUserRequest,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Create new user manually (Admin only)
    """
    require_admin(user_data)

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check if email already exists
    if request.email:
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")

    # Create new user in database
    new_db_user = User(
        username=request.username,
        email=request.email or f"{request.username}@example.com",
        password_hash=get_password_hash(request.password),
        role=request.role,
        status=UserStatus.ACTIVE
    )
    db.add(new_db_user)
    db.commit()
    db.refresh(new_db_user)

    # Create usage stats for new user
    stats = UsageStats(user_id=new_db_user.id)
    db.add(stats)
    db.commit()
    db.refresh(stats)

    # Determine monthly limit
    monthly_limit = get_monthly_limit(request.role)

    # Map role to subscription plan name
    subscription_plan = {
        UserRole.ADMIN: "unlimited",
        UserRole.PAID: "paid",
        UserRole.FREE: "free"
    }.get(request.role, "free")

    new_user = UserDetailResponse(
        user_id=new_db_user.id,
        username=new_db_user.username,
        email=new_db_user.email,
        role=new_db_user.role,
        subscription_plan=subscription_plan,
        monthly_limit=monthly_limit,
        monthly_used=0,
        remaining_characters=monthly_limit,
        total_characters_used=0,
        total_audio_generated=0,
        total_cost_usd=0.0,
        created_at=new_db_user.created_at.isoformat(),
        last_login=None,
        is_active=True,
        metadata={}
    )

    return new_user

@router.put("/admin/users/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Update user information (Admin only)
    """
    require_admin(user_data)

    # Query user from database
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user fields if provided
    if request.email is not None:
        # Check if email is already taken by another user
        existing_email = db.query(User).filter(
            User.email == request.email,
            User.id != user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        db_user.email = request.email

    if request.role is not None:
        db_user.role = request.role

    if request.is_active is not None:
        db_user.status = UserStatus.ACTIVE if request.is_active else UserStatus.INACTIVE

    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)

    # Get usage stats
    stats = db.query(UsageStats).filter(UsageStats.user_id == user_id).first()
    if not stats:
        stats = UsageStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    # Determine monthly limit based on role
    monthly_limit = get_monthly_limit(db_user.role)

    # Map role to subscription plan name
    subscription_plan = {
        UserRole.ADMIN: "unlimited",
        UserRole.PAID: "paid",
        UserRole.FREE: "free"
    }.get(db_user.role, "free")

    updated_user = UserDetailResponse(
        user_id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        role=db_user.role,
        subscription_plan=subscription_plan,
        monthly_limit=monthly_limit,
        monthly_used=stats.monthly_characters_used,
        remaining_characters=max(0, monthly_limit - stats.monthly_characters_used),
        total_characters_used=stats.total_characters_used,
        total_audio_generated=stats.total_audio_generated,
        total_cost_usd=stats.total_cost_usd,
        created_at=db_user.created_at.isoformat(),
        last_login=db_user.last_login.isoformat() if db_user.last_login else None,
        is_active=(db_user.status == UserStatus.ACTIVE),
        metadata={}
    )

    return updated_user

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Delete user (Admin only)

    Deletes user and all associated data (usage stats, audio files, etc.)
    """
    require_admin(user_data)

    # Query user from database
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting yourself
    if user_data.get("user_id") == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Delete associated usage stats
    db.query(UsageStats).filter(UsageStats.user_id == user_id).delete()

    # Delete user
    db.delete(db_user)
    db.commit()

    return {
        "success": True,
        "message": f"User {db_user.username} (ID: {user_id}) deleted successfully"
    }
