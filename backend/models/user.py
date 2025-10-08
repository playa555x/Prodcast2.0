"""
User Models - Pydantic & SQLAlchemy
Production-Ready with NO MOCKS
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

# ============================================
# Enums
# ============================================

class UserRole(str, Enum):
    """User role types"""
    ADMIN = "admin"
    PAID = "paid"
    FREE = "free"

class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

# ============================================
# Pydantic Models (API DTOs)
# ============================================

class UserBase(BaseModel):
    """Base user model"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.FREE

class UserCreate(UserBase):
    """User creation request"""
    password: str = Field(..., min_length=8, max_length=100)

class UserUpdate(BaseModel):
    """User update request"""
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None

class UserInDB(UserBase):
    """User as stored in database"""
    id: str
    password_hash: str
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    """User response (public data)"""
    id: str
    username: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserStats(BaseModel):
    """User usage statistics"""
    user_id: str
    total_characters_used: int = 0
    total_audio_generated: int = 0
    total_cost_usd: float = 0.0
    monthly_characters_used: int = 0
    monthly_limit: int
    remaining_characters: int
    
    class Config:
        from_attributes = True

# ============================================
# SQLAlchemy ORM Models
# ============================================

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Integer, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    """User table"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.FREE, nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"

class UsageStats(Base):
    """User usage statistics table"""
    __tablename__ = "usage_stats"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    
    # Usage tracking
    total_characters_used = Column(Integer, default=0, nullable=False)
    total_audio_generated = Column(Integer, default=0, nullable=False)
    total_cost_usd = Column(Float, default=0.0, nullable=False)
    
    # Monthly limits (reset each month)
    monthly_characters_used = Column(Integer, default=0, nullable=False)
    monthly_reset_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<UsageStats(user_id={self.user_id}, monthly_used={self.monthly_characters_used})>"
