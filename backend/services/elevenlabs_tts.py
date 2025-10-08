"""
ElevenLabs TTS Service
Production-Ready Implementation - NO MOCKS
Premium Quality Voice Synthesis
"""

import httpx
import logging
from typing import Optional, List, Dict
from pathlib import Path
import asyncio

from core.config import settings

logger = logging.getLogger(__name__)

class ElevenLabsTTSService:
    """
    ElevenLabs Text-to-Speech Service
    
    API Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
    """
    
    BASE_URL = "https://api.elevenlabs.io/v1"
    
    # Popular preset voices (ElevenLabs has 100+ voices available via API)
    VOICES = {
        "21m00Tcm4TlvDq8ikWAM": "Rachel - American Female, Calm",
        "AZnzlk1XvdvUeBnXmlld": "Domi - American Female, Strong",
        "EXAVITQu4vr4xnSDxMaL": "Bella - American Female, Soft",
        "ErXwobaYiN019PkySvjV": "Antoni - American Male, Well-rounded",
        "MF3mGyEYCl7XYWbV9V6O": "Elli - American Female, Emotional",
        "TxGEqnHWrfWFTfGW9XjX": "Josh - American Male, Deep",
        "VR6AewLTigWG4xSOukaG": "Arnold - American Male, Crisp",
        "pNInz6obpgDQGcFmaJgB": "Adam - American Male, Deep",
        "yoZ06aMxZJJ28mfd3POQ": "Sam - American Male, Raspy"
    }
    
    def __init__(self):
        """Initialize ElevenLabs TTS service"""
        self.api_key = settings.ELEVENLABS_API_KEY
        
        if not self.api_key:
            logger.warning("ElevenLabs API key not configured")
    
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
                "name": desc.split(" - ")[0] if " - " in desc else voice_id,
                "description": desc,
                "language": "en",
                "gender": self._guess_gender(desc),
                "is_premium": False,  # Fallback voices are standard
                "price_per_token": 0.000180  # $180 per 1M characters (Multilingual v1)
            }
            for voice_id, desc in self.VOICES.items()
        ]

    async def get_voices_dynamic(
        self,
        language_filter: Optional[str] = None,
        gender_filter: Optional[str] = None,
        category_filter: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Hierarchical voice loading system:

        1. PRIMARY: All voices from API (filter by language if specified)
        2. USER CHOICE: Filter by language, gender, category
        3. FALLBACK: English voices when API unavailable
        4. WORST CASE: Empty list (handled at API endpoint level)

        Args:
            language_filter: Language code (optional - if not specified, returns all languages)
            gender_filter: Filter by gender ("male", "female", "neutral")
            category_filter: Filter by category

        Returns:
            List of voice dicts (NEVER raises exception)
        """
        # Log filter settings
        if language_filter:
            logger.info(f"Loading ElevenLabs voices with language filter: {language_filter}")
        else:
            logger.info("Loading ElevenLabs voices - ALL LANGUAGES")

        # 2. If API unavailable -> English fallback voices
        if not self.is_available():
            logger.warning("ElevenLabs API key not configured")
            logger.info("Returning English fallback voices (Hierarchical Level 3)")
            fallback_voices = self.get_voices()

            # Apply gender/category filters to fallback (but not language, they're English)
            if gender_filter or category_filter:
                filtered = [
                    v for v in fallback_voices
                    if (not gender_filter or v.get("gender") == gender_filter)
                    and (not category_filter or v.get("category") == category_filter)
                ]
                if filtered:
                    logger.info(f"Returning {len(filtered)}/{len(fallback_voices)} filtered English fallback voices")
                    return filtered

            logger.info(f"Returning all {len(fallback_voices)} English fallback voices")
            return fallback_voices

        # 3. Try to fetch from API (both standard AND shared voices)
        try:
            # Fetch standard/legacy voices (54 voices)
            api_voices = await self.get_available_voices()

            # Fetch shared/community voices (5000+ voices from Voice Library)
            shared_voices = await self.get_shared_voices(max_voices=1000)

            if not api_voices and not shared_voices:
                logger.warning("API returned no voices, using English fallback")
                return self.get_voices()

            logger.info(f"Loaded {len(api_voices)} standard voices and {len(shared_voices)} shared voices")

            # Transform and filter voices from both sources
            voices = []

            # Process standard/legacy voices
            for voice in api_voices:
                category = voice.get("category", "conversational")
                is_premium = "professional" in category.lower() or "turbo" in str(voice.get("labels", {})).lower()

                voice_language = voice.get("labels", {}).get("language", "en")

                voice_data = {
                    "id": voice.get("voice_id"),
                    "name": voice.get("name"),
                    "description": f"{voice.get('name')} - {voice.get('category', 'conversational')}",
                    "language": voice_language,
                    "gender": voice.get("labels", {}).get("gender", "neutral"),
                    "category": category,
                    "preview_url": voice.get("preview_url"),
                    "is_premium": is_premium,
                    "price_per_token": 0.000300 if is_premium else 0.000180
                }

                # Apply filters
                if language_filter and voice_data["language"] != language_filter:
                    continue
                if gender_filter and voice_data["gender"] != gender_filter:
                    continue
                if category_filter and voice_data.get("category") != category_filter:
                    continue

                voices.append(voice_data)

            # Process shared/community voices
            for voice in shared_voices:
                category = voice.get("category", "conversational")
                is_premium = category == "professional"

                voice_language = voice.get("language", "en")

                # Extract gender and age from shared voice
                gender = voice.get("gender", "neutral")
                age = voice.get("age", "")

                # Build description
                description_parts = [voice.get("name", "Unknown")]
                if gender:
                    description_parts.append(gender)
                if age:
                    description_parts.append(age)
                if voice.get("accent"):
                    description_parts.append(voice.get("accent"))

                voice_data = {
                    "id": voice.get("voice_id"),
                    "name": voice.get("name"),
                    "description": " - ".join(description_parts),
                    "language": voice_language,
                    "gender": gender,
                    "category": category,
                    "preview_url": voice.get("preview_url"),
                    "is_premium": is_premium,
                    "price_per_token": 0.000300 if is_premium else 0.000180
                }

                # Apply filters
                if language_filter and voice_data["language"] != language_filter:
                    continue
                if gender_filter and voice_data["gender"] != gender_filter:
                    continue
                if category_filter and voice_data.get("category") != category_filter:
                    continue

                voices.append(voice_data)

            if voices:
                logger.info(f"Loaded {len(voices)} total voices from ElevenLabs (filtered)")
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
    
    def _guess_gender(self, description: str) -> str:
        """Guess gender from description"""
        if "Female" in description:
            return "female"
        elif "Male" in description:
            return "male"
        return "neutral"
    
    async def generate_speech(
        self,
        text: str,
        voice_id: str = "21m00Tcm4TlvDq8ikWAM",  # Rachel
        model_id: str = "eleven_monolingual_v1",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        use_speaker_boost: bool = True,
        output_path: Optional[Path] = None
    ) -> bytes:
        """
        Generate speech from text
        
        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID
            model_id: Model to use (eleven_monolingual_v1, eleven_multilingual_v2)
            stability: Voice stability (0.0-1.0, higher = more stable)
            similarity_boost: Voice similarity (0.0-1.0, higher = more similar to original)
            style: Style exaggeration (0.0-1.0, higher = more expressive)
            use_speaker_boost: Enable speaker boost for clarity
            output_path: Optional path to save audio file
            
        Returns:
            Audio bytes (MP3 format)
            
        Raises:
            Exception: If API call fails
        """
        if not self.is_available():
            raise Exception("ElevenLabs API key not configured")
        
        # Validate inputs
        if not 0.0 <= stability <= 1.0:
            raise ValueError(f"Invalid stability: {stability}. Must be between 0.0 and 1.0")
        
        if not 0.0 <= similarity_boost <= 1.0:
            raise ValueError(f"Invalid similarity_boost: {similarity_boost}. Must be between 0.0 and 1.0")
        
        if not 0.0 <= style <= 1.0:
            raise ValueError(f"Invalid style: {style}. Must be between 0.0 and 1.0")
        
        logger.info(f"Generating speech with ElevenLabs: {len(text)} chars, voice={voice_id}")
        
        # Prepare request
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}"
        
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "use_speaker_boost": use_speaker_boost
            }
        }
        
        # Make request with retry logic
        max_retries = 3
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        url,
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
                        error_msg = f"ElevenLabs API error: {response.status_code} - {response.text}"
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
    
    async def get_available_voices(self) -> List[Dict]:
        """
        Fetch all available voices from ElevenLabs API

        Returns:
            List of voice objects from API
        """
        if not self.is_available():
            raise Exception("ElevenLabs API key not configured")

        # Include legacy voices to get all available voices (20 standard + 34 legacy = 54 total)
        url = f"{self.BASE_URL}/voices?show_legacy=true"
        headers = {"xi-api-key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    return data.get("voices", [])
                else:
                    logger.error(f"Failed to fetch voices: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching voices: {e}")
            return []

    async def get_shared_voices(self, max_voices: int = 1000) -> List[Dict]:
        """
        Fetch shared/community voices from ElevenLabs Voice Library

        Args:
            max_voices: Maximum number of voices to fetch (default 1000)

        Returns:
            List of shared voice objects from Voice Library
        """
        if not self.is_available():
            logger.warning("ElevenLabs API key not configured")
            return []

        url = f"{self.BASE_URL}/shared-voices?page_size=100"
        headers = {"xi-api-key": self.api_key}

        all_voices = []
        page = 1
        max_pages = (max_voices // 100) + 1

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                while url and page <= max_pages and len(all_voices) < max_voices:
                    logger.info(f"Fetching shared voices page {page}...")

                    response = await client.get(url, headers=headers)

                    if response.status_code == 200:
                        data = response.json()
                        voices = data.get("voices", [])
                        all_voices.extend(voices)

                        logger.info(f"Got {len(voices)} voices (total: {len(all_voices)})")

                        # Check if there are more pages
                        if data.get("has_more") and voices:
                            # Use last voice's date_unix as cursor for pagination
                            last_date = voices[-1].get("date_unix")
                            if last_date:
                                url = f"{self.BASE_URL}/shared-voices?page_size=100&before_date_unix={last_date}"
                                page += 1
                            else:
                                break
                        else:
                            break
                    else:
                        logger.error(f"Failed to fetch shared voices: {response.status_code}")
                        break

        except Exception as e:
            logger.error(f"Error fetching shared voices: {e}")

        logger.info(f"Total shared voices loaded: {len(all_voices)}")
        return all_voices
    
    def calculate_cost(self, character_count: int) -> float:
        """
        Calculate cost for text
        
        Args:
            character_count: Number of characters
            
        Returns:
            Cost in USD
        """
        # ElevenLabs pricing (as of 2024)
        cost_per_char = settings.COST_ELEVENLABS
        
        return character_count * cost_per_char
