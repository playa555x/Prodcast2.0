"""
Authentication API Endpoints
Production-Ready with JWT + bcrypt - NO MOCKS
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.security import (
    verify_password,
    create_access_token,
    get_current_user_id,
    get_current_user_data,
    create_user_token_data
)
from models.user import User, UserRole, UserStatus

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)

# ============================================
# Request/Response Models
# ============================================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# Authentication Endpoints
# ============================================

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(http_request: Request, request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with username and password
    
    Returns JWT access token
    
    Default admin:
    - Username: admin  
    - Password: Set via ADMIN_DEFAULT_PASSWORD env var (default: ChangeMeNow123!)
    """
    logger.info(f"Login attempt for user: {request.username}")
    
    # Get user from database
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user:
        logger.warning(f"User not found: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password with bcrypt
    if not verify_password(request.password, user.password_hash):
        logger.warning(f"Invalid password for user: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if user is active
    if user.status != UserStatus.ACTIVE:
        logger.warning(f"User account not active: {request.username}  ")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate JWT token
    token_data = create_user_token_data(user)
    access_token = create_access_token(token_data)

    logger.info(f"Login successful for user: {request.username}")

    return LoginResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value
        }
    )

@router.post("/logout")
async def logout(user_id: str = Depends(get_current_user_id)):
    """
    Logout (client should delete token)
    
    Note: With JWT, logout is primarily client-side.
    For production, implement token blacklist.
    """
    logger.info(f"Logout request for user: {user_id}")
    
    # TODO: Add token to blacklist (future enhancement)
    
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user info from JWT token
    """
    user_id = user_data.get("sub")
    
    # Get fresh user data from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role.value,
        status=user.status.value,
        created_at=user.created_at,
        last_login=user.last_login
    )
