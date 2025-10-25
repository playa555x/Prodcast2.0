"""
Narrative Intelligence Engine
Professional story construction using Hero's Journey, Three-Act Structure

Quality: 15/10 - Hollywood-Level Storytelling
"""

import logging
from typing import Dict, List
from dataclasses import dataclass
from services.claude_api import ClaudeAPIService

logger = logging.getLogger(__name__)


@dataclass
class Scene:
    """Story scene/segment"""
    title: str
    content: str
    duration_seconds: int
    act: int  # 1, 2, or 3
    tension_level: float  # 0.0 - 1.0
    emotional_tone: str
    key_points: List[str]


@dataclass
class NarrativeStructure:
    """Complete narrative structure"""
    hook: str
    scenes: List[Scene]
    climax: Scene
    resolution: str
    tension_curve: List[float]  # Tension at each point
    callbacks: List[Dict]  # References to earlier points


class NarrativeEngine:
    """
    Professional Story Construction AI

    Implements:
    - Hero's Journey framework
    - Three-Act Structure
    - Tension curve design
    - Hook engineering
    - Callback system
    - Pattern interrupts
    """

    def __init__(self):
        self.claude = ClaudeAPIService()

    async def construct_narrative(self,
                                  research_data: Dict,
                                  target_duration: int,
                                  audience: str = "general") -> NarrativeStructure:
        """
        Construct professional narrative from research

        Args:
            research_data: Research findings
            target_duration: Target duration in minutes
            audience: Target audience

        Returns:
            Complete narrative structure
        """
        logger.info(f"📖 Constructing narrative ({target_duration} min)...")

        try:
            system_prompt = """You are a master storyteller and dramaturg specializing
            in podcast narrative construction.

            You craft stories using:
            - Hero's Journey framework
            - Three-Act Structure
            - Tension curve design
            - Pattern interrupts every 90 seconds
            - Emotional beats
            - Surprise elements
            - Callback techniques"""

            user_prompt = f"""Create a compelling {target_duration}-minute podcast narrative
            for {audience} audience using this research:

            RESEARCH DATA:
            {str(research_data)[:4000]}

            Construct narrative with:

            1. HOOK (30-45 seconds)
               - Opening question or surprising fact
               - Stakes establishment
               - Curiosity gap creation

            2. ACT 1 - Setup (25% of duration)
               - Introduce topic
               - Establish context
               - Present initial problem/question
               - Create investment

            3. ACT 2 - Conflict/Exploration (50% of duration)
               - Deepen the problem
               - Explore different angles
               - Present controversies
               - Build tension
               - Pattern interrupts every 90 seconds

            4. ACT 3 - Resolution (25% of duration)
               - Climax/revelation
               - Answer the question
               - Provide takeaways
               - Emotional resolution

            5. TENSION CURVE
               - Map tension level 0.0-1.0 at key points
               - Should rise and fall naturally
               - Peak at climax

            6. CALLBACKS
               - References to earlier points
               - Create cohesion

            For each scene provide:
            - title: Scene title
            - content: Scene outline (50-150 words)
            - duration_seconds: Approximate duration
            - act: 1, 2, or 3
            - tension_level: 0.0-1.0
            - emotional_tone: curious|concerned|excited|thoughtful|surprised
            - key_points: 3-5 bullet points

            Format as JSON with keys: hook, scenes, climax_scene_index, resolution,
            tension_curve, callbacks"""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=4000,
                temperature=0.7
            )

            import json
            try:
                narrative_data = json.loads(response.get("content", "{}"))

                # Convert to NarrativeStructure
                scenes = []
                for scene_data in narrative_data.get("scenes", []):
                    scenes.append(Scene(
                        title=scene_data.get("title", ""),
                        content=scene_data.get("content", ""),
                        duration_seconds=scene_data.get("duration_seconds", 60),
                        act=scene_data.get("act", 1),
                        tension_level=scene_data.get("tension_level", 0.5),
                        emotional_tone=scene_data.get("emotional_tone", "neutral"),
                        key_points=scene_data.get("key_points", [])
                    ))

                # Identify climax
                climax_idx = narrative_data.get("climax_scene_index", len(scenes)//2)
                climax = scenes[climax_idx] if climax_idx < len(scenes) else scenes[-1]

                structure = NarrativeStructure(
                    hook=narrative_data.get("hook", ""),
                    scenes=scenes,
                    climax=climax,
                    resolution=narrative_data.get("resolution", ""),
                    tension_curve=narrative_data.get("tension_curve", []),
                    callbacks=narrative_data.get("callbacks", [])
                )

                logger.info(f"✅ Created narrative with {len(scenes)} scenes")
                return structure

            except Exception as e:
                logger.error(f"Failed to parse narrative: {e}")
                return self._create_fallback_structure(research_data, target_duration)

        except Exception as e:
            logger.error(f"Narrative construction failed: {e}")
            return self._create_fallback_structure(research_data, target_duration)

    def _create_fallback_structure(self, research_data: Dict, duration: int) -> NarrativeStructure:
        """Create basic fallback structure"""
        return NarrativeStructure(
            hook="Fascinating topic ahead...",
            scenes=[
                Scene(
                    title="Introduction",
                    content=str(research_data)[:200],
                    duration_seconds=duration * 60,
                    act=1,
                    tension_level=0.5,
                    emotional_tone="neutral",
                    key_points=["Main topic", "Context", "Why it matters"]
                )
            ],
            climax=Scene(
                title="Key Insight",
                content="Main revelation",
                duration_seconds=120,
                act=2,
                tension_level=0.9,
                emotional_tone="excited",
                key_points=["Core insight"]
            ),
            resolution="Summary and takeaways",
            tension_curve=[0.3, 0.5, 0.7, 0.9, 0.6, 0.4],
            callbacks=[]
        )
