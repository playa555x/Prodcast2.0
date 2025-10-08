"""
Microsoft Edge TTS Service (edge-tts)
FREE - No API Key Required!
400+ High-Quality Voices
"""

import logging
from typing import Optional, List, Dict
from pathlib import Path
import asyncio
import edge_tts

logger = logging.getLogger(__name__)

class MicrosoftTTSService:
    """
    Microsoft Edge Text-to-Speech Service using edge-tts library

    FREE SERVICE - No API key required!
    400+ premium voices across 100+ languages

    Features:
    - Neural voices (same quality as Azure Cognitive Services)
    - Multiple accents and emotions
    - SSML support
    - Adjustable rate, pitch, and volume

    Docs: https://github.com/rany2/edge-tts
    """

    def __init__(self):
        """Initialize Microsoft Edge TTS service (no API key needed!)"""
        logger.info("Microsoft Edge TTS initialized - FREE service, no API key required")

    def is_available(self) -> bool:
        """Check if service is available (always True - no API key needed!)"""
        return True

    async def get_all_voices(self) -> List[Dict[str, any]]:
        """
        Get all available voices from Edge TTS API

        Returns:
            List of all voice objects (400+)
        """
        try:
            voices_list = await edge_tts.list_voices()
            logger.info(f"Loaded {len(voices_list)} Microsoft Edge TTS voices")
            return voices_list
        except Exception as e:
            logger.error(f"Error loading Edge TTS voices: {e}")
            return []

    def get_voices(self) -> List[Dict[str, str]]:
        """
        Get popular voices (sync version for initial loading)

        Returns fallback list of most popular voices
        For full list, use get_voices_dynamic()

        Returns:
            List of popular voice info dicts
        """
        # Popular voices across different languages
        popular_voices = [
            # German
            {"id": "de-DE-KatjaNeural", "name": "Katja (German, Female)", "language": "de", "gender": "female"},
            {"id": "de-DE-ConradNeural", "name": "Conrad (German, Male)", "language": "de", "gender": "male"},
            {"id": "de-DE-AmalaNeural", "name": "Amala (German, Female)", "language": "de", "gender": "female"},

            # English US
            {"id": "en-US-AriaNeural", "name": "Aria (US, Female)", "language": "en", "gender": "female"},
            {"id": "en-US-GuyNeural", "name": "Guy (US, Male)", "language": "en", "gender": "male"},
            {"id": "en-US-JennyNeural", "name": "Jenny (US, Female)", "language": "en", "gender": "female"},

            # English UK
            {"id": "en-GB-SoniaNeural", "name": "Sonia (UK, Female)", "language": "en", "gender": "female"},
            {"id": "en-GB-RyanNeural", "name": "Ryan (UK, Male)", "language": "en", "gender": "male"},

            # Spanish
            {"id": "es-ES-ElviraNeural", "name": "Elvira (Spanish, Female)", "language": "es", "gender": "female"},
            {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Spanish, Male)", "language": "es", "gender": "male"},

            # French
            {"id": "fr-FR-DeniseNeural", "name": "Denise (French, Female)", "language": "fr", "gender": "female"},
            {"id": "fr-FR-HenriNeural", "name": "Henri (French, Male)", "language": "fr", "gender": "male"},

            # Italian
            {"id": "it-IT-ElsaNeural", "name": "Elsa (Italian, Female)", "language": "it", "gender": "female"},
            {"id": "it-IT-DiegoNeural", "name": "Diego (Italian, Male)", "language": "it", "gender": "male"},

            # Japanese
            {"id": "ja-JP-NanamiNeural", "name": "Nanami (Japanese, Female)", "language": "ja", "gender": "female"},
            {"id": "ja-JP-KeitaNeural", "name": "Keita (Japanese, Male)", "language": "ja", "gender": "male"},
        ]

        voices = []
        for v in popular_voices:
            voices.append({
                "id": v["id"],
                "name": v["name"],
                "description": f"Microsoft Edge TTS - {v['name']}",
                "language": v["language"],
                "gender": v["gender"],
                "is_premium": False,  # FREE!
                "price_per_token": 0.0  # FREE!
            })

        logger.info(f"Loaded {len(voices)} popular Microsoft Edge TTS voices")
        return voices

    async def get_voices_dynamic(
        self,
        language_filter: Optional[str] = None,
        gender_filter: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Get all voices with filtering (400+ voices!)

        Args:
            language_filter: Language code filter (e.g., "de", "en", "es")
            gender_filter: Gender filter ("male", "female")

        Returns:
            List of filtered voice dicts
        """
        try:
            # Get all voices from API
            all_voices = await self.get_all_voices()

            if not all_voices:
                logger.warning("No voices from API, using fallback")
                return self.get_voices()

            # Transform and filter voices
            voices = []
            for voice in all_voices:
                # Extract info
                voice_id = voice.get("ShortName", "")
                voice_name = voice.get("FriendlyName", voice_id)
                locale = voice.get("Locale", "en-US")
                gender_raw = voice.get("Gender", "Female")

                # Extract language code (first 2 chars, e.g., "de" from "de-DE")
                language = locale.split("-")[0] if "-" in locale else locale[:2]

                # Parse gender
                gender = "female" if gender_raw.lower() == "female" else "male"

                # Apply filters
                if language_filter and language != language_filter:
                    continue

                if gender_filter and gender != gender_filter:
                    continue

                # Get voice type (Neural is premium quality)
                voice_type = "Neural" if "Neural" in voice_id else "Standard"

                voices.append({
                    "id": voice_id,
                    "name": voice_name,
                    "description": f"Microsoft {voice_type} - {locale}",
                    "language": language,
                    "gender": gender,
                    "locale": locale,
                    "is_premium": False,  # FREE but high quality!
                    "price_per_token": 0.0  # FREE!
                })

            logger.info(f"Loaded {len(voices)} filtered Microsoft Edge TTS voices")
            return voices

        except Exception as e:
            logger.error(f"Error loading dynamic voices: {e}")
            # Fallback to popular voices
            voices = self.get_voices()

            # Apply filters to fallback
            if language_filter:
                voices = [v for v in voices if v["language"] == language_filter]
            if gender_filter:
                voices = [v for v in voices if v["gender"] == gender_filter]

            return voices

    async def generate_speech(
        self,
        text: str,
        voice: str = "en-US-AriaNeural",
        speed: float = 1.0,
        pitch: float = 0.0,
        volume: float = 1.0,
        output_path: Optional[Path] = None
    ) -> bytes:
        """
        Generate speech from text using Microsoft Edge TTS

        Args:
            text: Text to convert to speech
            voice: Voice ID (e.g., "de-DE-KatjaNeural", "en-US-AriaNeural")
            speed: Speed multiplier (0.5 - 2.0)
            pitch: Pitch adjustment in Hz (-50 to +50)
            volume: Volume multiplier (0.0 - 1.0)
            output_path: Optional path to save audio file

        Returns:
            Audio bytes (MP3 format)

        Raises:
            Exception: If generation fails
        """
        logger.info(f"Generating speech with Microsoft Edge TTS: {len(text)} chars, voice={voice}")

        try:
            # Convert parameters to SSML-compatible format
            # Rate: -50% to +100%
            rate_percent = int((speed - 1.0) * 100)
            rate_str = f"{rate_percent:+d}%"

            # Pitch: -50Hz to +50Hz
            pitch_str = f"{pitch:+.0f}Hz"

            # Volume: 0-100%
            volume_percent = int(volume * 100)
            volume_str = f"{volume_percent}%"

            # Create Edge TTS communicator
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str
            )

            # Generate audio
            audio_data = b""

            if output_path:
                # Save directly to file
                output_path.parent.mkdir(parents=True, exist_ok=True)
                await communicate.save(str(output_path))
                audio_data = output_path.read_bytes()
                logger.info(f"Saved audio to {output_path}")
            else:
                # Collect audio chunks in memory
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_data += chunk["data"]

            logger.info(f"Generated {len(audio_data)} bytes of audio")
            return audio_data

        except Exception as e:
            logger.error(f"Microsoft Edge TTS generation failed: {e}")
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
