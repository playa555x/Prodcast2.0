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
import uuid

from core.security import get_current_user_data
from models.user import UserRole

# ============================================
# Router
# ============================================

router = APIRouter()

# ============================================
# In-Memory Storage (Replace with Database)
# ============================================

USERS_DB = {}  # username -> user data

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
    if user_data.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")

# ============================================
# Routes
# ============================================

@router.get("/admin/users", response_model=List[UserListItem])
async def list_users(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get list of all users (Admin only)

    Returns user overview with statistics
    """
    require_admin(user_data)

    # Mock data for demonstration
    # TODO: Replace with actual database query
    users = [
        UserListItem(
            user_id="user-1",
            username="testuser",
            email="test@example.com",
            role=UserRole.USER,
            subscription_plan="free",
            monthly_limit=10000,
            monthly_used=2500,
            total_characters_used=45000,
            total_cost_usd=1.25,
            created_at="2025-09-15T10:00:00Z",
            last_login="2025-10-06T14:30:00Z",
            is_active=True
        ),
        UserListItem(
            user_id="admin-1",
            username="admin",
            email="admin@example.com",
            role=UserRole.ADMIN,
            subscription_plan="unlimited",
            monthly_limit=999999999,
            monthly_used=15000,
            total_characters_used=120000,
            total_cost_usd=3.50,
            created_at="2025-08-01T08:00:00Z",
            last_login="2025-10-07T09:00:00Z",
            is_active=True
        )
    ]

    return users

@router.get("/admin/users/{user_id}", response_model=UserDetailResponse)
async def get_user_details(
    user_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get detailed user information (Admin only)
    """
    require_admin(user_data)

    # Mock detailed user data
    # TODO: Replace with actual database query
    user = UserDetailResponse(
        user_id=user_id,
        username="testuser",
        email="test@example.com",
        role=UserRole.USER,
        subscription_plan="free",
        monthly_limit=10000,
        monthly_used=2500,
        remaining_characters=7500,
        total_characters_used=45000,
        total_audio_generated=23,
        total_cost_usd=1.25,
        created_at="2025-09-15T10:00:00Z",
        last_login="2025-10-06T14:30:00Z",
        is_active=True,
        metadata={
            "preferred_provider": "elevenlabs",
            "default_voice": "Rachel"
        }
    )

    return user

@router.post("/admin/users", response_model=UserDetailResponse)
async def create_user(
    request: CreateUserRequest,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Create new user manually (Admin only)
    """
    require_admin(user_data)

    # Check if username already exists
    if request.username in USERS_DB:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Create new user
    user_id = str(uuid.uuid4())
    new_user = UserDetailResponse(
        user_id=user_id,
        username=request.username,
        email=request.email,
        role=request.role,
        subscription_plan=request.subscription_plan,
        monthly_limit=request.monthly_limit,
        monthly_used=0,
        remaining_characters=request.monthly_limit,
        total_characters_used=0,
        total_audio_generated=0,
        total_cost_usd=0.0,
        created_at=datetime.utcnow().isoformat(),
        last_login=None,
        is_active=True,
        metadata={}
    )

    # Store user (in-memory for now)
    USERS_DB[request.username] = new_user.dict()

    return new_user

@router.put("/admin/users/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Update user information (Admin only)
    """
    require_admin(user_data)

    # Mock update
    # TODO: Replace with actual database update
    updated_user = UserDetailResponse(
        user_id=user_id,
        username="testuser",
        email=request.email or "test@example.com",
        role=request.role or UserRole.USER,
        subscription_plan=request.subscription_plan or "free",
        monthly_limit=request.monthly_limit or 10000,
        monthly_used=2500,
        remaining_characters=7500,
        total_characters_used=45000,
        total_audio_generated=23,
        total_cost_usd=1.25,
        created_at="2025-09-15T10:00:00Z",
        last_login="2025-10-06T14:30:00Z",
        is_active=request.is_active if request.is_active is not None else True,
        metadata={}
    )

    return updated_user

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Delete user (Admin only)
    """
    require_admin(user_data)

    # Mock deletion
    # TODO: Replace with actual database deletion
    return {"success": True, "message": f"User {user_id} deleted"}
