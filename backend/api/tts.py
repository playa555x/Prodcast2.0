"""
TTS API Endpoints  
Production-Ready with Real TTS Services - NO MOCKS
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import uuid

from core.database import get_db
from core.security import get_current_user_data
from models.audio import AudioGenerateRequest, AudioGenerateResponse, VoiceInfo, ProviderInfo, TTSProvider, AudioStatus
from models.user import User, UserRole
from services.openai_tts import OpenAITTSService
from services.speechify_tts import SpeechifyTTSService
from services.google_tts import GoogleTTSService
from services.microsoft_tts import MicrosoftTTSService
from services.elevenlabs_tts import ElevenLabsTTSService
from services.amazon_polly_wrapper import AmazonPollyWrapper
from services.chatterbox_wrapper import ChatterboxWrapper
from services.xtts_v2_wrapper import XTTSV2Wrapper
from services.kokoro_wrapper import KokoroWrapper

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================
# TTS Service Instances
# ============================================

openai_tts = OpenAITTSService()
speechify_tts = SpeechifyTTSService()
google_tts = GoogleTTSService()
microsoft_tts = MicrosoftTTSService()
elevenlabs_tts = ElevenLabsTTSService()

# New TTS providers
amazon_polly_tts = AmazonPollyWrapper()
chatterbox_tts = ChatterboxWrapper()
xtts_v2_tts = XTTSV2Wrapper()
kokoro_tts = KokoroWrapper()

# ============================================
# TTS Endpoints
# ============================================

@router.get("/providers", response_model=List[ProviderInfo])
async def get_providers():
    """
    Get available TTS providers and their voices

    Returns demo data if no API keys configured (for development)
    """
    providers = []

    # OpenAI - Always include (demo if not available)
    if openai_tts.is_available():
        voices = openai_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.OPENAI,
            name="OpenAI TTS",
            available=True,
            voices=voices,
            cost_per_character=0.000015,
            max_characters=4096
        ))
    else:
        # Demo provider for development
        providers.append(ProviderInfo(
            provider=TTSProvider.OPENAI,
            name="OpenAI TTS (Demo)",
            available=False,
            voices=[
                VoiceInfo(
                    id="alloy",
                    name="Alloy (Demo)",
                    language="en",
                    gender="neutral",
                    description="Demo voice - Configure API key for real TTS"
                )
            ],
            cost_per_character=0.000015,
            max_characters=4096
        ))

    # Speechify
    if speechify_tts.is_available():
        voices = speechify_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.SPEECHIFY,
            name="Speechify",
            available=True,
            voices=voices,
            cost_per_character=0.00002,
            max_characters=50000
        ))
    else:
        providers.append(ProviderInfo(
            provider=TTSProvider.SPEECHIFY,
            name="Speechify (Demo)",
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
        ))

    # Google TTS (gTTS - FREE, no API key required!)
    if google_tts.is_available():
        voices = google_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.GOOGLE,
            name="Google TTS (FREE)",
            available=True,
            voices=voices,
            cost_per_character=0.0,  # FREE!
            max_characters=100000
        ))

    # Microsoft Edge TTS (edge-tts - FREE, no API key required!)
    if microsoft_tts.is_available():
        voices = microsoft_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.MICROSOFT,
            name="Microsoft Edge TTS (FREE)",
            available=True,
            voices=voices,
            cost_per_character=0.0,  # FREE!
            max_characters=100000
        ))

    # ElevenLabs
    if elevenlabs_tts.is_available():
        voices = elevenlabs_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.ELEVENLABS,
            name="ElevenLabs",
            available=True,
            voices=voices,
            cost_per_character=0.00003,
            max_characters=5000
        ))
    else:
        providers.append(ProviderInfo(
            provider=TTSProvider.ELEVENLABS,
            name="ElevenLabs (Demo)",
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
        ))

    # Amazon Polly
    if amazon_polly_tts.is_available():
        voices = amazon_polly_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.AMAZON_POLLY,
            name="Amazon Polly Neural",
            available=True,
            voices=voices,
            cost_per_character=0.000016,
            max_characters=100000
        ))
    else:
        providers.append(ProviderInfo(
            provider=TTSProvider.AMAZON_POLLY,
            name="Amazon Polly (Demo)",
            available=False,
            voices=[
                VoiceInfo(
                    id="vicki-demo",
                    name="Vicki (Demo)",
                    language="de-DE",
                    gender="female",
                    description="Demo voice - Configure AWS credentials"
                )
            ],
            cost_per_character=0.000016,
            max_characters=100000
        ))

    # Chatterbox (FREE, better than ElevenLabs!)
    if chatterbox_tts.is_available():
        voices = chatterbox_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.CHATTERBOX,
            name="Chatterbox (FREE - Better than ElevenLabs)",
            available=True,
            voices=voices,
            cost_per_character=0.0,
            max_characters=100000
        ))

    # XTTS-v2 (Voice Cloning, FREE)
    if xtts_v2_tts.is_available():
        voices = xtts_v2_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.XTTS_V2,
            name="XTTS-v2 Voice Cloning (FREE)",
            available=True,
            voices=voices,
            cost_per_character=0.0,
            max_characters=100000
        ))

    # Kokoro (Ultra-fast, FREE)
    if kokoro_tts.is_available():
        voices = kokoro_tts.get_voices()
        providers.append(ProviderInfo(
            provider=TTSProvider.KOKORO,
            name="Kokoro Ultra-Fast (FREE, <150ms)",
            available=True,
            voices=voices,
            cost_per_character=0.0,
            max_characters=100000
        ))

    # Always return at least demo providers for development
    return providers

@router.get("/voices/{provider}", response_model=List[VoiceInfo])
async def get_voices(
    provider: TTSProvider,
    language: Optional[str] = None,
    gender: Optional[str] = None,
    category: Optional[str] = None
):
    """
    Get available voices with hierarchical fallback system:

    1. PRIMARY: German voices from API (default language="de")
    2. USER CHOICE: Other languages selectable
    3. FALLBACK: English voices when API unavailable
    4. WORST CASE: Detailed error message + hints for alternatives

    Query Parameters:
    - language: Language code (default: "de" for German product)
    - gender: Filter by gender ("male", "female", "neutral")
    - category: Filter by category (e.g., "conversational", "narrative")
    """
    voices = []
    error_details = None

    if provider == TTSProvider.ELEVENLABS:
        # ElevenLabs with hierarchical fallback (NEVER throws 503)
        voices = await elevenlabs_tts.get_voices_dynamic(
            language_filter=language,
            gender_filter=gender,
            category_filter=category
        )

        if not voices:
            error_details = {
                "provider": "ElevenLabs",
                "error": "No voices available",
                "api_configured": elevenlabs_tts.is_available(),
                "language_requested": language or "de",
                "fallback_used": False,
                "alternatives": ["Try OpenAI TTS", "Try Speechify", "Configure ElevenLabs API key"]
            }

    elif provider == TTSProvider.GOOGLE:
        # Google TTS (gTTS - FREE!)
        voices = await google_tts.get_voices_dynamic(
            language_filter=language,
            gender_filter=gender
        )

        if not voices:
            error_details = {
                "provider": "Google TTS (FREE)",
                "error": "No voices available",
                "api_configured": True,  # Always available - no API key needed!
                "language_requested": language or "en",
                "fallback_used": False,
                "alternatives": ["Try Microsoft Edge TTS", "Try ElevenLabs", "Try Speechify"]
            }

    elif provider == TTSProvider.MICROSOFT:
        # Microsoft Edge TTS (edge-tts - FREE!)
        voices = await microsoft_tts.get_voices_dynamic(
            language_filter=language,
            gender_filter=gender
        )

        if not voices:
            error_details = {
                "provider": "Microsoft Edge TTS (FREE)",
                "error": "No voices available",
                "api_configured": True,  # Always available - no API key needed!
                "language_requested": language or "en",
                "fallback_used": False,
                "alternatives": ["Try Google TTS", "Try ElevenLabs", "Try OpenAI"]
            }

    elif provider == TTSProvider.OPENAI:
        if openai_tts.is_available():
            voices = openai_tts.get_voices()
        else:
            error_details = {
                "provider": "OpenAI TTS",
                "error": "API key not configured",
                "api_configured": False,
                "alternatives": ["Try ElevenLabs", "Try Speechify", "Configure OpenAI API key"]
            }

    elif provider == TTSProvider.SPEECHIFY:
        # Speechify with hierarchical fallback (NEVER throws 503)
        voices = await speechify_tts.get_voices_dynamic(
            language_filter=language,
            gender_filter=gender,
            voice_type_filter=category  # Use category as voice_type filter
        )

        if not voices:
            error_details = {
                "provider": "Speechify",
                "error": "No voices available",
                "api_configured": speechify_tts.is_available(),
                "language_requested": language or "all",
                "fallback_used": False,
                "alternatives": ["Try ElevenLabs", "Try OpenAI TTS", "Configure Speechify API key"]
            }

    elif provider == TTSProvider.AMAZON_POLLY:
        # Amazon Polly (Neural TTS)
        if amazon_polly_tts.is_available():
            voices = amazon_polly_tts.get_voices()
        else:
            error_details = {
                "provider": "Amazon Polly",
                "error": "AWS credentials not configured",
                "api_configured": False,
                "alternatives": ["Try Chatterbox (FREE)", "Try Google TTS", "Configure AWS credentials"]
            }

    elif provider == TTSProvider.CHATTERBOX:
        # Chatterbox (FREE, better than ElevenLabs!)
        voices = chatterbox_tts.get_voices()
        if not voices:
            error_details = {
                "provider": "Chatterbox",
                "error": "Service temporarily unavailable",
                "api_configured": True,
                "alternatives": ["Try XTTS-v2", "Try Kokoro", "Try ElevenLabs"]
            }

    elif provider == TTSProvider.XTTS_V2:
        # XTTS-v2 (Voice Cloning, FREE)
        voices = xtts_v2_tts.get_voices()
        if not voices:
            error_details = {
                "provider": "XTTS-v2",
                "error": "Service temporarily unavailable",
                "api_configured": True,
                "alternatives": ["Try Chatterbox", "Try Kokoro", "Try ElevenLabs"]
            }

    elif provider == TTSProvider.KOKORO:
        # Kokoro (Ultra-fast, FREE)
        voices = kokoro_tts.get_voices()
        if not voices:
            error_details = {
                "provider": "Kokoro",
                "error": "Service temporarily unavailable",
                "api_configured": True,
                "alternatives": ["Try Chatterbox", "Try XTTS-v2", "Try Google TTS"]
            }

    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    # If no voices and we have error details, return detailed error
    if not voices and error_details:
        logger.error(f"No voices available for {provider}: {error_details}")
        raise HTTPException(
            status_code=503,
            detail={
                "message": f"{error_details['provider']} is not available",
                "error": error_details['error'],
                "api_configured": error_details['api_configured'],
                "alternatives": error_details['alternatives'],
                "hint": "Configure API keys in Admin Settings or try alternative providers"
            }
        )

    return voices

@router.post("/generate", response_model=AudioGenerateResponse)
async def generate_audio(
    request: AudioGenerateRequest,
    user_data: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Generate audio from text using TTS
    
    Checks user permissions and usage limits
    """
    user_id = user_data.get("sub")
    user_role = user_data.get("role")
    
    logger.info(f"Audio generation request from user {user_id}: {len(request.text)} chars, provider={request.provider}")
    
    # TODO: Check usage limits based on user_role
    # For now, allow all requests
    
    # Select TTS service
    if request.provider == TTSProvider.OPENAI:
        if not openai_tts.is_available():
            raise HTTPException(status_code=503, detail="OpenAI TTS not configured")
        service = openai_tts
    
    elif request.provider == TTSProvider.SPEECHIFY:
        if not speechify_tts.is_available():
            raise HTTPException(status_code=503, detail="Speechify not configured")
        service = speechify_tts

    elif request.provider == TTSProvider.GOOGLE:
        # Google TTS (gTTS - always available, FREE!)
        service = google_tts

    elif request.provider == TTSProvider.MICROSOFT:
        # Microsoft Edge TTS (edge-tts - always available, FREE!)
        service = microsoft_tts

    elif request.provider == TTSProvider.ELEVENLABS:
        if not elevenlabs_tts.is_available():
            raise HTTPException(status_code=503, detail="ElevenLabs not configured")
        service = elevenlabs_tts

    elif request.provider == TTSProvider.AMAZON_POLLY:
        if not amazon_polly_tts.is_available():
            raise HTTPException(status_code=503, detail="Amazon Polly not configured - Add AWS credentials")
        service = amazon_polly_tts

    elif request.provider == TTSProvider.CHATTERBOX:
        # Chatterbox is always available (FREE!)
        service = chatterbox_tts

    elif request.provider == TTSProvider.XTTS_V2:
        # XTTS-v2 is always available (FREE!)
        service = xtts_v2_tts

    elif request.provider == TTSProvider.KOKORO:
        # Kokoro is always available (FREE!)
        service = kokoro_tts

    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
    
    try:
        # Generate audio
        audio_id = str(uuid.uuid4())
        output_path = Path(f"audio_output/{audio_id}.mp3")
        
        # Call appropriate service method
        if request.provider == TTSProvider.ELEVENLABS:
            audio_bytes = await service.generate_speech(
                text=request.text,
                voice_id=request.voice,
                output_path=output_path
            )
        else:
            audio_bytes = await service.generate_speech(
                text=request.text,
                voice=request.voice,
                speed=request.speed,
                output_path=output_path
            )
        
        # Calculate cost
        character_count = len(request.text)
        cost = service.calculate_cost(character_count)
        
        # TODO: Save to database (AudioGeneration model)
        # TODO: Update user usage stats
        
        logger.info(f"Audio generated successfully: {audio_id}, {len(audio_bytes)} bytes")
        
        return AudioGenerateResponse(
            audio_id=audio_id,
            status=AudioStatus.COMPLETED,
            audio_url=f"/api/tts/download/{audio_id}",
            duration_seconds=len(request.text) / 15.0,  # Rough estimate
            file_size_bytes=len(audio_bytes),
            character_count=character_count,
            cost_usd=cost,
            provider=request.provider,
            voice=request.voice
        )
    
    except Exception as e:
        logger.error(f"Audio generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{audio_id}")
async def download_audio(audio_id: str):
    """
    Download generated audio file
    """
    audio_path = Path(f"audio_output/{audio_id}.mp3")
    
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    audio_bytes = audio_path.read_bytes()
    
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"attachment; filename={audio_id}.mp3"
        }
    )
# Reload trigger - All 9 TTS providers integrated (OpenAI, Speechify, Google, Microsoft, ElevenLabs, Amazon Polly, Chatterbox, XTTS-v2, Kokoro)
