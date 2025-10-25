"""
Entity Extraction & Classification
Identifies and classifies entities: people, organizations, concepts, technologies

Quality: 12/10
"""

import logging
from typing import Dict, List
from services.claude_api import ClaudeAPIService

logger = logging.getLogger(__name__)


class EntityExtractor:
    """Extract and classify named entities"""

    def __init__(self):
        self.claude = ClaudeAPIService()

    async def extract(self, topic: str, sources: Dict) -> List[Dict]:
        """
        Extract entities and classify them

        Returns: List of entities with type, relevance, description
        """
        logger.info("🏷️  Extracting entities...")

        try:
            content = self._aggregate_sources(sources)

            system_prompt = """You are an entity recognition specialist."""

            user_prompt = f"""Extract all important entities from research about: "{topic}"

            Sources:
            {content[:5000]}

            For each entity provide:
            - name: Entity name
            - type: person|organization|technology|concept|location|event
            - description: Brief description
            - relevance_score: 1-10 (how relevant to topic)
            - mentions: How many times mentioned

            Format as JSON array of entities."""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=2500,
                temperature=0.3
            )

            import json
            try:
                entities = json.loads(response.get("content", "[]"))
                logger.info(f"✅ Extracted {len(entities)} entities")
                return entities if isinstance(entities, list) else []
            except:
                return []

        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            return []

    def _aggregate_sources(self, sources: Dict) -> str:
        parts = []
        for source_list in sources.values():
            for source in source_list[:3]:
                if isinstance(source, dict):
                    content = source.get("content", source.get("abstract", ""))
                    if content:
                        parts.append(content)
        return "\n\n".join(parts)
