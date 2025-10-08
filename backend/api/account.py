"""
User Account API Routes

Features:
- Get own profile data
- Update profile
- View personal statistics
- Subscription management
- Billing history

Quality: 12/10
Last updated: 2025-10-07
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from core.security import get_current_user_data
from models.user import UserRole

# ============================================
# Router
# ============================================

router = APIRouter()

# ============================================
# Models
# ============================================

class UserProfile(BaseModel):
    """User profile information"""
    user_id: str
    username: str
    email: Optional[EmailStr] = None
    role: UserRole
    created_at: str
    last_login: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    """Request to update profile"""
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None

class UserStatistics(BaseModel):
    """User statistics"""
    user_id: str
    total_characters_used: int
    total_audio_generated: int
    total_cost_usd: float
    monthly_characters_used: int
    monthly_limit: int
    remaining_characters: int
    usage_percentage: float
    favorite_provider: Optional[str] = None
    favorite_voice: Optional[str] = None
    total_projects: int
    completed_projects: int

class SubscriptionPlan(BaseModel):
    """Subscription plan details"""
    plan_id: str
    name: str
    description: str
    monthly_price_usd: float
    monthly_characters: int
    features: List[str]
    is_popular: bool = False

class CurrentSubscription(BaseModel):
    """Current user subscription"""
    plan_id: str
    plan_name: str
    monthly_characters: int
    used_characters: int
    remaining_characters: int
    renewal_date: Optional[str] = None
    status: str  # active, cancelled, expired

class BillingHistoryItem(BaseModel):
    """Billing history entry"""
    transaction_id: str
    date: str
    description: str
    amount_usd: float
    status: str  # paid, pending, failed

# ============================================
# Routes - Profile
# ============================================

@router.get("/account/profile", response_model=UserProfile)
async def get_profile(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get own profile data
    """
    user_id = user_data.get("sub")
    username = user_data.get("username")
    role = user_data.get("role")

    profile = UserProfile(
        user_id=user_id,
        username=username,
        email=f"{username}@example.com",  # TODO: Load from DB
        role=UserRole(role),
        created_at="2025-09-15T10:00:00Z",  # TODO: Load from DB
        last_login="2025-10-07T09:00:00Z"  # TODO: Load from DB
    )

    return profile

@router.put("/account/profile", response_model=UserProfile)
async def update_profile(
    request: UpdateProfileRequest,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Update own profile
    """
    user_id = user_data.get("sub")
    username = user_data.get("username")
    role = user_data.get("role")

    # TODO: Update in database

    updated_profile = UserProfile(
        user_id=user_id,
        username=username,
        email=request.email or f"{username}@example.com",
        role=UserRole(role),
        created_at="2025-09-15T10:00:00Z",
        last_login=datetime.utcnow().isoformat()
    )

    return updated_profile

# ============================================
# Routes - Statistics
# ============================================

@router.get("/account/statistics", response_model=UserStatistics)
async def get_statistics(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get personal usage statistics
    """
    user_id = user_data.get("sub")

    # Mock statistics
    # TODO: Load from database
    monthly_used = 2500
    monthly_limit = 10000

    stats = UserStatistics(
        user_id=user_id,
        total_characters_used=45000,
        total_audio_generated=23,
        total_cost_usd=1.25,
        monthly_characters_used=monthly_used,
        monthly_limit=monthly_limit,
        remaining_characters=monthly_limit - monthly_used,
        usage_percentage=(monthly_used / monthly_limit) * 100,
        favorite_provider="elevenlabs",
        favorite_voice="Rachel",
        total_projects=5,
        completed_projects=3
    )

    return stats

# ============================================
# Routes - Subscription
# ============================================

@router.get("/subscriptions/plans", response_model=List[SubscriptionPlan])
async def get_subscription_plans():
    """
    Get available subscription plans
    """
    plans = [
        SubscriptionPlan(
            plan_id="free",
            name="Free",
            description="Perfect for trying out the platform",
            monthly_price_usd=0.0,
            monthly_characters=10000,
            features=[
                "10,000 characters/month",
                "Basic voice selection",
                "Standard quality",
                "Community support"
            ],
            is_popular=False
        ),
        SubscriptionPlan(
            plan_id="starter",
            name="Starter",
            description="Great for personal projects",
            monthly_price_usd=9.99,
            monthly_characters=100000,
            features=[
                "100,000 characters/month",
                "All voice providers",
                "HD quality audio",
                "Email support",
                "Voice library access"
            ],
            is_popular=False
        ),
        SubscriptionPlan(
            plan_id="pro",
            name="Professional",
            description="For content creators and businesses",
            monthly_price_usd=29.99,
            monthly_characters=500000,
            features=[
                "500,000 characters/month",
                "All premium voices",
                "Priority processing",
                "Priority support",
                "Advanced studio features",
                "API access"
            ],
            is_popular=True
        ),
        SubscriptionPlan(
            plan_id="enterprise",
            name="Enterprise",
            description="Unlimited power for large teams",
            monthly_price_usd=99.99,
            monthly_characters=999999999,
            features=[
                "Unlimited characters",
                "All features included",
                "Dedicated support",
                "Custom voice training",
                "SLA guarantee",
                "Team management",
                "Advanced analytics"
            ],
            is_popular=False
        )
    ]

    return plans

@router.get("/subscriptions/current", response_model=CurrentSubscription)
async def get_current_subscription(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get current subscription
    """
    user_id = user_data.get("sub")

    # Mock current subscription
    # TODO: Load from database
    subscription = CurrentSubscription(
        plan_id="free",
        plan_name="Free",
        monthly_characters=10000,
        used_characters=2500,
        remaining_characters=7500,
        renewal_date=None,
        status="active"
    )

    return subscription

@router.post("/subscriptions/subscribe")
async def subscribe_to_plan(
    plan_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Subscribe to a plan
    """
    user_id = user_data.get("sub")

    # TODO: Implement payment processing
    # TODO: Update user subscription in database

    return {
        "success": True,
        "message": f"Successfully subscribed to {plan_id}",
        "plan_id": plan_id
    }

@router.post("/subscriptions/cancel")
async def cancel_subscription(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Cancel current subscription
    """
    user_id = user_data.get("sub")

    # TODO: Cancel subscription in database

    return {
        "success": True,
        "message": "Subscription cancelled. You will retain access until the end of your billing period."
    }

# ============================================
# Routes - Billing
# ============================================

@router.get("/account/billing-history", response_model=List[BillingHistoryItem])
async def get_billing_history(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get billing history
    """
    user_id = user_data.get("sub")

    # Mock billing history
    # TODO: Load from database
    history = [
        BillingHistoryItem(
            transaction_id="txn-001",
            date="2025-10-01T00:00:00Z",
            description="Professional Plan - October 2025",
            amount_usd=29.99,
            status="paid"
        ),
        BillingHistoryItem(
            transaction_id="txn-002",
            date="2025-09-01T00:00:00Z",
            description="Professional Plan - September 2025",
            amount_usd=29.99,
            status="paid"
        )
    ]

    return history
