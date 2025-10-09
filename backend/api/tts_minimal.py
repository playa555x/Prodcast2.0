"""
TTS API Endpoints - Minimal Version (No Database)
Only includes /providers endpoint for deployment
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from enum import Enum

router = APIRouter()

# ============================================
# Minimal Models (No Database Dependency)
# ============================================

class TTSProvider(str, Enum):
    OPENAI = "openai"
    SPEECHIFY = "speechify"
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    ELEVENLABS = "elevenlabs"

class VoiceInfo(BaseModel):
    id: str
    name: str
    language: str
    gender: str
    description: str = ""

class ProviderInfo(BaseModel):
    provider: TTSProvider
    name: str
    available: bool
    voices: List[VoiceInfo]
    cost_per_character: float
    max_characters: int

# ============================================
# Static Provider Data
# ============================================

DEMO_PROVIDERS = [
    ProviderInfo(
        provider=TTSProvider.OPENAI,
        name="OpenAI TTS",
        available=False,
        voices=[
            VoiceInfo(
                id="alloy",
                name="Alloy (Demo)",
                language="en",
                gender="neutral",
                description="Demo voice - Configure API key for real TTS"
            ),
            VoiceInfo(
                id="echo",
                name="Echo (Demo)",
                language="en",
                gender="male",
                description="Demo voice - Configure API key for real TTS"
            )
        ],
        cost_per_character=0.000015,
        max_characters=4096
    ),
    ProviderInfo(
        provider=TTSProvider.SPEECHIFY,
        name="Speechify",
        available=False,
        voices=[
            VoiceInfo(
                id="henry",
                name="Henry (Demo)",
                language="en",
                gender="male",
                description="Demo voice - Configure API key for real TTS"
            )
        ],
        cost_per_character=0.00002,
        max_characters=50000
    ),
    ProviderInfo(
        provider=TTSProvider.GOOGLE,
        name="Google TTS (FREE)",
        available=True,
        voices=[
            VoiceInfo(
                id="de-DE",
                name="German (Germany)",
                language="de",
                gender="neutral",
                description="Free Google TTS - German"
            ),
            VoiceInfo(
                id="en-US",
                name="English (US)",
                language="en",
                gender="neutral",
                description="Free Google TTS - English"
            )
        ],
        cost_per_character=0.0,
        max_characters=100000
    ),
    ProviderInfo(
        provider=TTSProvider.MICROSOFT,
        name="Microsoft Edge TTS (FREE)",
        available=True,
        voices=[
            VoiceInfo(
                id="de-DE-KatjaNeural",
                name="Katja (German, Female)",
                language="de",
                gender="female",
                description="Free Microsoft Edge TTS - German Female"
            ),
            VoiceInfo(
                id="en-US-JennyNeural",
                name="Jenny (English, Female)",
                language="en",
                gender="female",
                description="Free Microsoft Edge TTS - English Female"
            )
        ],
        cost_per_character=0.0,
        max_characters=100000
    ),
    ProviderInfo(
        provider=TTSProvider.ELEVENLABS,
        name="ElevenLabs",
        available=False,
        voices=[
            VoiceInfo(
                id="rachel",
                name="Rachel (Demo)",
                language="en",
                gender="female",
                description="Demo voice - Configure ElevenLabs API key"
            )
        ],
        cost_per_character=0.00003,
        max_characters=5000
    )
]

# ============================================
# Minimal Endpoints
# ============================================

@router.get("/providers", response_model=List[ProviderInfo])
async def get_providers():
    """
    Get available TTS providers and their voices

    Returns static demo data (no database required)
    Perfect for initial deployment and frontend development
    """
    return DEMO_PROVIDERS

@router.get("/health")
async def health():
    """TTS service health check"""
    return {
        "status": "operational",
        "mode": "minimal",
        "providers_count": len(DEMO_PROVIDERS),
        "message": "TTS API running in minimal mode (no database)"
    }
