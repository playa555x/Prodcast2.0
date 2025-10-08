"""
OpenAI TTS Service
Production-Ready Implementation - NO MOCKS
"""

import httpx
import logging
from typing import Optional, List, Dict
from pathlib import Path
import asyncio

from core.config import settings

logger = logging.getLogger(__name__)

class OpenAITTSService:
    """
    OpenAI Text-to-Speech Service
    
    API Docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
    """
    
    BASE_URL = "https://api.openai.com/v1/audio/speech"
    
    # Available models
    MODELS = {
        "tts-1": "Fast, lower quality",
        "tts-1-hd": "High quality, slower"
    }
    
    # Available voices (Standard TTS API - 6 voices)
    # Note: Ash, Ballad, Coral, Sage, Verse are only available in Realtime API
    VOICES = {
        "alloy": "Neutral, balanced",
        "echo": "Male, clear",
        "fable": "British accent",
        "onyx": "Deep male",
        "nova": "Female, energetic",
        "shimmer": "Female, soft"
    }
    
    def __init__(self):
        """Initialize OpenAI TTS service"""
        self.api_key = settings.OPENAI_API_KEY
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured")
    
    def is_available(self) -> bool:
        """Check if service is available (API key configured)"""
        return self.api_key is not None and len(self.api_key) > 0
    
    def get_voices(self) -> List[Dict[str, str]]:
        """
        Get available voices

        Returns:
            List of voice info dicts
        """
        # OpenAI pricing: tts-1 = $15/1M chars, tts-1-hd = $30/1M chars
        # HD model is considered "premium"
        return [
            {
                "id": voice_id,
                "name": voice_id.capitalize(),
                "description": desc,
                "language": "en",
                "gender": self._guess_gender(voice_id),
                "is_premium": True,  # HD model is premium
                "price_per_token": 0.000030  # $30 per 1M characters (HD model)
            }
            for voice_id, desc in self.VOICES.items()
        ]
    
    def _guess_gender(self, voice_id: str) -> str:
        """Guess gender from voice ID (based on OpenAI documentation)"""
        female = ["ballad", "coral", "nova", "shimmer"]
        male = ["alloy", "ash", "echo", "fable", "onyx", "sage", "verse"]
        if voice_id in female:
            return "female"
        elif voice_id in male:
            return "male"
        return "neutral"
    
    async def generate_speech(
        self,
        text: str,
        voice: str = "alloy",
        model: str = "tts-1-hd",
        speed: float = 1.0,
        output_path: Optional[Path] = None
    ) -> bytes:
        """
        Generate speech from text
        
        Args:
            text: Text to convert to speech
            voice: Voice ID (alloy, echo, fable, onyx, nova, shimmer)
            model: Model to use (tts-1 or tts-1-hd)
            speed: Speed (0.25 to 4.0)
            output_path: Optional path to save audio file
            
        Returns:
            Audio bytes (MP3 format)
            
        Raises:
            Exception: If API call fails
        """
        if not self.is_available():
            raise Exception("OpenAI API key not configured")
        
        # Validate inputs
        if voice not in self.VOICES:
            raise ValueError(f"Invalid voice: {voice}. Must be one of: {list(self.VOICES.keys())}")
        
        if model not in self.MODELS:
            raise ValueError(f"Invalid model: {model}. Must be one of: {list(self.MODELS.keys())}")
        
        if not 0.25 <= speed <= 4.0:
            raise ValueError(f"Invalid speed: {speed}. Must be between 0.25 and 4.0")
        
        logger.info(f"Generating speech with OpenAI: {len(text)} chars, voice={voice}, model={model}")
        
        # Prepare request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "input": text,
            "voice": voice,
            "speed": speed,
            "response_format": "mp3"
        }
        
        # Make request with retry logic
        max_retries = 3
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.BASE_URL,
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        audio_bytes = response.content
                        
                        # Save to file if path provided
                        if output_path:
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            output_path.write_bytes(audio_bytes)
                            logger.info(f"Saved audio to {output_path}")
                        
                        logger.info(f"Generated {len(audio_bytes)} bytes of audio")
                        return audio_bytes
                    else:
                        error_msg = f"OpenAI API error: {response.status_code} - {response.text}"
                        logger.error(error_msg)
                        
                        # Don't retry on client errors (4xx)
                        if 400 <= response.status_code < 500:
                            raise Exception(error_msg)
                        
                        # Retry on server errors (5xx)
                        if attempt < max_retries - 1:
                            logger.warning(f"Retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                        else:
                            raise Exception(error_msg)
                            
            except httpx.TimeoutException:
                logger.error("Request timed out")
                if attempt < max_retries - 1:
                    logger.warning(f"Retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    raise Exception("Request timed out after multiple retries")
            
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                if attempt < max_retries - 1 and not isinstance(e, ValueError):
                    logger.warning(f"Retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    raise
        
        raise Exception("Failed to generate speech after multiple retries")
    
    def calculate_cost(self, character_count: int, model: str = "tts-1-hd") -> float:
        """
        Calculate cost for text
        
        Args:
            character_count: Number of characters
            model: Model (affects pricing)
            
        Returns:
            Cost in USD
        """
        # OpenAI pricing (as of 2024)
        cost_per_char = settings.COST_OPENAI
        
        return character_count * cost_per_char
