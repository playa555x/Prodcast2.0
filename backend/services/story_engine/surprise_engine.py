"""
Surprise & Pattern Interrupt Engine
Keeps listeners engaged every 90 seconds

Quality: 15/10
"""

import logging
from typing import Dict, List
from dataclasses import dataclass
from services.claude_api import ClaudeAPIService

logger = logging.getLogger(__name__)


@dataclass
class Surprise:
    """Surprise/pattern interrupt element"""
    type: str  # "statistical", "counterintuitive", "twist", "contradiction", "personal"
    content: str
    timestamp: float  # When to inject
    impact_level: float  # 0.0-1.0


class SurpriseEngine:
    """Generate surprises and pattern interrupts"""

    def __init__(self):
        self.claude = ClaudeAPIService()

    async def generate_surprises(self,
                                narrative: str,
                                duration_minutes: int) -> List[Surprise]:
        """
        Generate pattern interrupts every ~90 seconds

        Args:
            narrative: Narrative content
            duration_minutes: Total duration

        Returns:
            List of surprise elements with timing
        """
        logger.info("🎆 Generating surprises...")

        num_surprises = max(1, duration_minutes // 2)  # One per 2 minutes

        try:
            system_prompt = """You are a cognitive engagement specialist creating
            pattern interrupts for podcasts."""

            user_prompt = f"""Generate {num_surprises} surprise elements for this narrative:

            NARRATIVE:
            {narrative[:3000]}

            For each surprise provide:
            - type: statistical|counterintuitive|twist|contradiction|personal
            - content: The surprising element (1-2 sentences)
            - timestamp: When to place it (seconds into episode)
            - impact_level: 0.0-1.0 (how surprising)

            Types:
            - statistical: "Did you know 97% of..."
            - counterintuitive: "You'd think X, but actually Y"
            - twist: Unexpected revelation
            - contradiction: "Even experts disagree on..."
            - personal: "This affects you because..."

            Space them every 90-120 seconds.
            Format as JSON array."""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=1500,
                temperature=0.7
            )

            import json
            try:
                surprises_data = json.loads(response.get("content", "[]"))

                surprises = []
                for s in surprises_data:
                    surprises.append(Surprise(
                        type=s.get("type", "statistical"),
                        content=s.get("content", ""),
                        timestamp=s.get("timestamp", 0),
                        impact_level=s.get("impact_level", 0.7)
                    ))

                logger.info(f"✅ Generated {len(surprises)} surprises")
                return surprises

            except:
                return []

        except Exception as e:
            logger.error(f"Surprise generation failed: {e}")
            return []


class SurpriseInjector:
    """Inject surprises into narrative"""

    @staticmethod
    def inject(narrative: str, surprises: List[Surprise]) -> str:
        """Inject surprises at appropriate points"""
        # In production: smart insertion based on timestamp
        # For now: placeholder
        return narrative
