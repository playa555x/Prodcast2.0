"""
Google Text-to-Speech Service (gTTS)
FREE - No API Key Required!
Uses Google Translate's TTS API
"""

import logging
from typing import Optional, List, Dict
from pathlib import Path
import asyncio
from gtts import gTTS as GoogleTTS
from gtts.lang import tts_langs

logger = logging.getLogger(__name__)

class GoogleTTSService:
    """
    Google Text-to-Speech Service using gTTS library

    FREE SERVICE - No API key required!
    Uses Google Translate's unofficial TTS API

    Docs: https://gtts.readthedocs.io/
    """

    def __init__(self):
        """Initialize Google TTS service (no API key needed!)"""
        logger.info("Google TTS (gTTS) initialized - FREE service, no API key required")

    def is_available(self) -> bool:
        """Check if service is available (always True - no API key needed!)"""
        return True

    def get_voices(self) -> List[Dict[str, str]]:
        """
        Get available voices/languages

        gTTS supports 100+ languages but with limited voice control
        Each language has one default voice from Google Translate

        Returns:
            List of voice info dicts (ALL 100+ languages)
        """
        try:
            # Get all supported languages from gTTS
            all_langs = tts_langs()

            voices = []

            # Add ALL supported languages
            for lang_code, lang_name in all_langs.items():
                voices.append({
                    "id": lang_code,
                    "name": lang_name.capitalize(),
                    "description": f"Google TTS - {lang_name.capitalize()}",
                    "language": lang_code,
                    "gender": "neutral",  # gTTS doesn't specify gender
                    "is_premium": False,  # FREE!
                    "price_per_token": 0.0  # FREE!
                })

            # Sort by name for better UX
            voices.sort(key=lambda x: x["name"])

            logger.info(f"Loaded {len(voices)} Google TTS voices (all languages)")
            return voices

        except Exception as e:
            logger.error(f"Error loading gTTS voices: {e}")
            # Fallback to basic English/German
            return [
                {
                    "id": "en",
                    "name": "English",
                    "description": "Google TTS - English",
                    "language": "en",
                    "gender": "neutral",
                    "is_premium": False,
                    "price_per_token": 0.0
                },
                {
                    "id": "de",
                    "name": "German",
                    "description": "Google TTS - German",
                    "language": "de",
                    "gender": "neutral",
                    "is_premium": False,
                    "price_per_token": 0.0
                }
            ]

    async def get_voices_dynamic(
        self,
        language_filter: Optional[str] = None,
        gender_filter: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Get voices with filtering

        Args:
            language_filter: Language code filter
            gender_filter: Not supported by gTTS (ignored)

        Returns:
            List of filtered voice dicts
        """
        voices = self.get_voices()

        if language_filter:
            voices = [v for v in voices if v["language"] == language_filter]

        return voices

    async def generate_speech(
        self,
        text: str,
        voice: str = "en",
        speed: float = 1.0,
        output_path: Optional[Path] = None
    ) -> bytes:
        """
        Generate speech from text using gTTS

        Args:
            text: Text to convert to speech
            voice: Language code (e.g., "en", "de", "es")
            speed: Speed multiplier (gTTS supports slow=True for 0.5x)
            output_path: Optional path to save audio file

        Returns:
            Audio bytes (MP3 format)

        Raises:
            Exception: If generation fails
        """
        logger.info(f"Generating speech with gTTS: {len(text)} chars, lang={voice}")

        try:
            # gTTS only supports slow=True (0.5x) or normal speed
            slow_mode = speed < 0.75

            # Create gTTS object
            tts = GoogleTTS(text=text, lang=voice, slow=slow_mode)

            # Generate audio to temporary file
            if output_path:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                tts.save(str(output_path))
                audio_bytes = output_path.read_bytes()
                logger.info(f"Saved audio to {output_path}")
            else:
                # Save to memory
                import io
                fp = io.BytesIO()
                tts.write_to_fp(fp)
                audio_bytes = fp.getvalue()

            logger.info(f"Generated {len(audio_bytes)} bytes of audio")
            return audio_bytes

        except Exception as e:
            logger.error(f"gTTS generation failed: {e}")
            raise Exception(f"Failed to generate speech: {e}")

    def calculate_cost(self, character_count: int) -> float:
        """
        Calculate cost for text (always $0 - it's FREE!)

        Args:
            character_count: Number of characters

        Returns:
            Cost in USD (always 0.0)
        """
        return 0.0  # FREE!
