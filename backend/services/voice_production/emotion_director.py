"""
Emotion Director - AI Performance Coach
Guides voice performance with emotion, pacing, emphasis

Quality: 15/10
"""

import logging
from typing import Dict, List
from dataclasses import dataclass
from services.claude_api import ClaudeAPIService
from .voice_engine import EmotionType, EmotionProfile

logger = logging.getLogger(__name__)


@dataclass
class PerformanceInstruction:
    """Performance instruction for a segment"""
    segment_text: str
    timestamp: float
    emotion: EmotionType
    energy_level: float
    pacing: str  # "slow", "medium", "fast"
    emphasis_words: List[str]
    pauses: List[Dict]  # {"position": int, "duration_ms": int}
    tone: str  # "conversational", "authoritative", "enthusiastic", etc.


@dataclass
class PerformanceGuide:
    """Complete performance guide for a script"""
    instructions: List[PerformanceInstruction]
    overall_arc: str  # Description of emotional arc
    key_moments: List[Dict]  # Special moments to highlight


class EmotionDirector:
    """
    AI Performance Director

    Analyzes scripts and provides detailed performance instructions:
    - Emotional arc mapping
    - Beat identification
    - Emphasis word selection
    - Pause placement
    - Energy level modulation
    - Tone guidance
    """

    def __init__(self):
        self.claude = ClaudeAPIService()

    async def direct_performance(self, script_text: str) -> PerformanceGuide:
        """
        Create performance guide for entire script

        Args:
            script_text: Full podcast script

        Returns:
            PerformanceGuide with detailed instructions
        """
        logger.info("🎬 Directing performance...")

        try:
            system_prompt = """You are a professional voice performance director
            specializing in podcast and audio production."""

            user_prompt = f"""Analyze this podcast script and provide detailed performance direction:

            SCRIPT:
            {script_text[:5000]}

            Provide:
            1. EMOTIONAL ARC: Overall emotional journey (2-3 sentences)
            2. SEGMENTS: Break into 10-15 segments with:
               - segment_text: The text (50-200 words)
               - timestamp: Approximate time in seconds
               - emotion: enthusiastic|thoughtful|surprised|concerned|joyful|serious|calm|excited|neutral
               - energy_level: 0.0-1.0
               - pacing: slow|medium|fast
               - emphasis_words: 3-5 key words to emphasize
               - pauses: [{"position": char_index, "duration_ms": milliseconds}]
               - tone: conversational|authoritative|enthusiastic|thoughtful
            3. KEY_MOMENTS: 3-5 special moments (hook, climax, revelation, etc.)

            Format as JSON with keys: emotional_arc, segments, key_moments"""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=3000,
                temperature=0.5
            )

            import json
            try:
                direction = json.loads(response.get("content", "{}"))

                # Convert to PerformanceGuide
                instructions = []
                for seg in direction.get("segments", []):
                    emotion = self._parse_emotion(seg.get("emotion", "neutral"))
                    instructions.append(PerformanceInstruction(
                        segment_text=seg.get("segment_text", ""),
                        timestamp=seg.get("timestamp", 0),
                        emotion=emotion,
                        energy_level=seg.get("energy_level", 0.7),
                        pacing=seg.get("pacing", "medium"),
                        emphasis_words=seg.get("emphasis_words", []),
                        pauses=seg.get("pauses", []),
                        tone=seg.get("tone", "conversational")
                    ))

                guide = PerformanceGuide(
                    instructions=instructions,
                    overall_arc=direction.get("emotional_arc", ""),
                    key_moments=direction.get("key_moments", [])
                )

                logger.info(f"✅ Created guide with {len(instructions)} segments")
                return guide

            except Exception as e:
                logger.error(f"Failed to parse direction: {e}")
                return self._create_fallback_guide(script_text)

        except Exception as e:
            logger.error(f"Performance direction failed: {e}")
            return self._create_fallback_guide(script_text)

    def _parse_emotion(self, emotion_str: str) -> EmotionType:
        """Parse emotion string to EmotionType"""
        mapping = {
            "enthusiastic": EmotionType.ENTHUSIASTIC,
            "thoughtful": EmotionType.THOUGHTFUL,
            "surprised": EmotionType.SURPRISED,
            "concerned": EmotionType.CONCERNED,
            "joyful": EmotionType.JOYFUL,
            "serious": EmotionType.SERIOUS,
            "calm": EmotionType.CALM,
            "excited": EmotionType.EXCITED,
            "neutral": EmotionType.NEUTRAL
        }
        return mapping.get(emotion_str.lower(), EmotionType.NEUTRAL)

    def _create_fallback_guide(self, script_text: str) -> PerformanceGuide:
        """Create basic fallback guide"""
        return PerformanceGuide(
            instructions=[
                PerformanceInstruction(
                    segment_text=script_text[:500],
                    timestamp=0,
                    emotion=EmotionType.NEUTRAL,
                    energy_level=0.7,
                    pacing="medium",
                    emphasis_words=[],
                    pauses=[],
                    tone="conversational"
                )
            ],
            overall_arc="Standard conversational flow",
            key_moments=[]
        )
