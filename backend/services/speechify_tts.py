"""
Speechify TTS Service
Production-Ready Implementation - NO MOCKS
"""

import httpx
import logging
from typing import Optional, List, Dict
from pathlib import Path
import asyncio

from core.config import settings

logger = logging.getLogger(__name__)

class SpeechifyTTSService:
    """
    Speechify Text-to-Speech Service
    
    API Docs: https://docs.sws.speechify.com/
    """
    
    BASE_URL = "https://api.sws.speechify.com/v1/audio/speech"
    
    # Available models
    MODELS = {
        "simba-english": "English optimized",
        "simba-multilingual": "Multi-language support",
        "simba-turbo": "Fast generation"
    }
    
    # Common voices (Speechify has many more via API) - Updated 2025
    VOICES = {
        "henry": "Male, American",
        "mia": "Female, American",
        "george": "Male, British",
        "jessica": "Female, British",
        "snoop": "Male, Hip-hop celebrity (Snoop Dogg)"
    }
    
    def __init__(self):
        """Initialize Speechify TTS service"""
        self.api_key = settings.SPEECHIFY_API_KEY
        
        if not self.api_key:
            logger.warning("Speechify API key not configured")
    
    def is_available(self) -> bool:
        """Check if service is available (API key configured)"""
        return self.api_key is not None and len(self.api_key) > 0
    
    def get_voices(self) -> List[Dict[str, str]]:
        """
        Get available voices - Returns hardcoded fallback list

        For dynamic loading of ALL voices, use get_voices_dynamic() or get_available_voices()

        Returns:
            List of voice info dicts (hardcoded fallback)
        """
        return [
            {
                "id": voice_id,
                "name": voice_id.capitalize(),
                "description": desc,
                "language": "en",
                "gender": self._guess_gender(voice_id),
                "is_premium": False,  # All Speechify voices are standard
                "price_per_token": 0.000020  # Estimated $20 per 1M characters
            }
            for voice_id, desc in self.VOICES.items()
        ]
    
    def _guess_gender(self, voice_id: str) -> str:
        """Guess gender from voice ID"""
        female = ["mia", "jessica"]
        return "female" if voice_id in female else "male"
    
    async def generate_speech(
        self,
        text: str,
        voice: str = "mia",
        model: str = "simba-english",
        speed: float = 1.0,
        output_path: Optional[Path] = None,
        use_ssml: bool = False,
        emotion: Optional[str] = None
    ) -> bytes:
        """
        Generate speech from text
        
        Args:
            text: Text to convert to speech (or SSML if use_ssml=True)
            voice: Voice ID
            model: Model to use
            speed: Speed (0.25 to 4.0)
            output_path: Optional path to save audio file
            use_ssml: Whether text is SSML format
            emotion: Optional emotion (happy, sad, angry, etc.)
            
        Returns:
            Audio bytes (MP3 format)
            
        Raises:
            Exception: If API call fails
        """
        if not self.is_available():
            raise Exception("Speechify API key not configured")
        
        # Validate inputs
        if model not in self.MODELS and not model.startswith("simba"):
            raise ValueError(f"Invalid model: {model}. Recommended: {list(self.MODELS.keys())}")
        
        if not 0.25 <= speed <= 4.0:
            raise ValueError(f"Invalid speed: {speed}. Must be between 0.25 and 4.0")
        
        logger.info(f"Generating speech with Speechify: {len(text)} chars, voice={voice}, model={model}")
        
        # Prepare request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "input": text,
            "voice_id": voice,
            "speed": speed,
            "audio_format": "mp3"
        }
        
        # Add SSML flag if needed
        if use_ssml:
            payload["ssml"] = True
        
        # Add emotion if specified
        if emotion:
            payload["emotion"] = emotion
        
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
                        error_msg = f"Speechify API error: {response.status_code} - {response.text}"
                        logger.error(error_msg)
                        
                        # Don't retry on client errors (4xx)
                        if 400 <= response.status_code < 500:
                            raise Exception(error_msg)
                        
                        # Retry on server errors (5xx)
                        if attempt < max_retries - 1:
                            logger.warning(f"Retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2
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
    
    async def clone_voice(
        self,
        audio_file_path: Path,
        voice_name: str,
        description: Optional[str] = None
    ) -> str:
        """
        Clone a voice from audio sample
        
        Args:
            audio_file_path: Path to audio file with voice sample
            voice_name: Name for the cloned voice
            description: Optional description
            
        Returns:
            Voice ID of cloned voice
            
        Note:
            This feature requires premium Speechify API access
        """
        if not self.is_available():
            raise Exception("Speechify API key not configured")
        
        logger.info(f"Cloning voice from {audio_file_path}")
        
        # TODO: Implement voice cloning endpoint
        # This requires the voice cloning API endpoint which may be different
        raise NotImplementedError("Voice cloning not yet implemented")
    
    async def get_available_voices(self) -> List[Dict]:
        """
        Fetch all available voices from Speechify API

        Returns:
            List of voice objects from API
        """
        if not self.is_available():
            raise Exception("Speechify API key not configured")

        url = "https://api.sws.speechify.com/v1/voices"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    voices = response.json()
                    return voices
                else:
                    logger.error(f"Failed to fetch voices: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching voices: {e}")
            return []

    async def get_voices_dynamic(
        self,
        language_filter: Optional[str] = None,
        gender_filter: Optional[str] = None,
        voice_type_filter: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Hierarchical voice loading system:

        1. PRIMARY: All voices from API (1490+ voices, 35 languages)
        2. USER CHOICE: Filter by language, gender, voice type
        3. FALLBACK: English voices when API unavailable (5 voices)
        4. WORST CASE: Empty list (handled at API endpoint level)

        Args:
            language_filter: Language/locale code (e.g., "en-US", "de-DE")
            gender_filter: Filter by gender ("male", "female")
            voice_type_filter: Filter by type ("shared", "personal")

        Returns:
            List of voice dicts (NEVER raises exception)
        """
        # Log filter settings
        if language_filter:
            logger.info(f"Loading Speechify voices with language filter: {language_filter}")
        else:
            logger.info("Loading Speechify voices - ALL LANGUAGES")

        # If API unavailable -> English fallback voices
        if not self.is_available():
            logger.warning("Speechify API key not configured")
            logger.info("Returning English fallback voices (Hierarchical Level 3)")
            return self.get_voices()

        # Try to fetch from API
        try:
            api_voices = await self.get_available_voices()

            if not api_voices:
                logger.warning("API returned no voices, using English fallback")
                return self.get_voices()

            logger.info(f"Loaded {len(api_voices)} voices from Speechify API")

            # Transform and filter voices
            voices = []

            for voice in api_voices:
                voice_type = voice.get("type", "shared")
                voice_locale = voice.get("locale", "en-US")
                voice_gender = voice.get("gender", "neutral")

                # Extract primary language code from locale (e.g., "en" from "en-US")
                language_code = voice_locale.split("-")[0] if voice_locale else "en"

                voice_data = {
                    "id": voice.get("id"),
                    "name": voice.get("display_name", voice.get("id", "Unknown")),
                    "description": f"{voice.get('display_name', 'Unknown')} - {voice_locale}",
                    "language": voice_locale,  # Full locale (e.g., "en-US")
                    "language_code": language_code,  # Short code (e.g., "en")
                    "gender": voice_gender,
                    "voice_type": voice_type,
                    "preview_url": voice.get("preview_audio"),
                    "is_premium": False,  # All Speechify voices are standard pricing
                    "price_per_token": 0.000020  # $20 per 1M characters
                }

                # Apply filters
                if language_filter:
                    # Match both full locale (en-US) and short code (en)
                    if language_filter.lower() not in [voice_locale.lower(), language_code.lower()]:
                        continue

                if gender_filter and voice_data["gender"] != gender_filter:
                    continue

                if voice_type_filter and voice_data["voice_type"] != voice_type_filter:
                    continue

                voices.append(voice_data)

            if voices:
                logger.info(f"Loaded {len(voices)} Speechify voices (filtered)")
                return voices
            else:
                # No voices found with filters -> English fallback
                logger.warning(f"No voices found with filters, using English fallback")
                return self.get_voices()

        except Exception as e:
            # API error -> English fallback
            logger.error(f"API error: {e}")
            logger.info("Using English fallback voices")
            return self.get_voices()

    def calculate_cost(self, character_count: int, model: str = "simba-english") -> float:
        """
        Calculate cost for text

        Args:
            character_count: Number of characters
            model: Model (may affect pricing)

        Returns:
            Cost in USD
        """
        # Speechify pricing (estimate)
        cost_per_char = settings.COST_SPEECHIFY

        return character_count * cost_per_char
