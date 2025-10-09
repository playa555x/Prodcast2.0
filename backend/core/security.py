"""
Security Module
Production-Ready JWT Authentication & Password Hashing
NO MOCKS - Real bcrypt + python-jose implementation
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from core.config import settings

logger = logging.getLogger(__name__)

# ============================================
# Password Hashing (bcrypt)
# ============================================

def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password

    Note:
        bcrypt has a 72-byte limit, passwords are truncated automatically
    """
    # bcrypt max length is 72 bytes
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise

    Note:
        bcrypt has a 72-byte limit, passwords are truncated automatically
    """
    # bcrypt max length is 72 bytes
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

# ============================================
# JWT Token Management
# ============================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Data to encode in token (e.g., user_id, username)
        expires_delta: Optional custom expiration time
        
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT access token

    Args:
        token: JWT token string

    Returns:
        Decoded token data

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.warning(f"Invalid JWT token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ============================================
# Authentication Dependencies
# ============================================

security = HTTPBearer()

async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Get current user ID from JWT token
    
    Usage:
        @app.get("/me")
        def get_me(user_id: str = Depends(get_current_user_id)):
            return {"user_id": user_id}
    
    Args:
        credentials: HTTP Bearer credentials from request header
        
    Returns:
        User ID from token
        
    Raises:
        HTTPException: If token is invalid or missing user_id
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    return user_id

async def get_current_user_data(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get complete current user data from JWT token
    
    Returns full payload including user_id, username, role
    
    Args:
        credentials: HTTP Bearer credentials from request header
        
    Returns:
        Complete user data from token
    """
    token = credentials.credentials
    return decode_access_token(token)

# ============================================
# Role-Based Access Control
# ============================================

def require_role(*allowed_roles: str):
    """
    Decorator to require specific user roles
    
    Usage:
        @app.get("/admin")
        @require_role("admin")
        def admin_route(user_data: dict = Depends(get_current_user_data)):
            return {"message": "Admin only"}
    
    Args:
        allowed_roles: Allowed role names (e.g., "admin", "paid")
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(user_data: Dict[str, Any] = Depends(get_current_user_data)):
        user_role = user_data.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required roles: {', '.join(allowed_roles)}"
            )
        
        return user_data
    
    return role_checker

# ============================================
# Optional Authentication (No Login Required)
# ============================================

async def get_optional_user_data(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Get user data if authenticated, None if not

    This allows endpoints to work WITHOUT login, but provide
    enhanced features when user IS logged in.

    Usage:
        @app.get("/projects")
        def list_projects(user_data: Optional[Dict] = Depends(get_optional_user_data)):
            if user_data:
                # User is logged in - return their projects
                user_id = user_data.get('username')
                return user_projects[user_id]
            else:
                # No login - return demo/public projects
                return demo_projects

    Args:
        credentials: HTTP Bearer credentials (optional)

    Returns:
        User data dict if authenticated, None otherwise
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        return decode_access_token(token)
    except HTTPException:
        # Invalid token - treat as no auth
        return None

# ============================================
# Utility Functions
# ============================================

def create_user_token_data(user) -> Dict[str, Any]:
    """
    Create token data from user object

    Args:
        user: User object from database

    Returns:
        Dictionary with user data for JWT token
    """
    return {
        "sub": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role
    }
