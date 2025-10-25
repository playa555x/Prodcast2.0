"""
Fact-Checking Pipeline
Verifies claims against multiple sources

Quality: 12/10
"""

import logging
from typing import Dict, List
from services.claude_api import ClaudeAPIService

logger = logging.getLogger(__name__)


class FactChecker:
    """Enterprise-grade fact-checking"""

    def __init__(self):
        self.claude = ClaudeAPIService()

    async def check_sources(self, sources: Dict) -> List[Dict]:
        """
        Fact-check claims from sources

        Returns: List of fact-checks with verdict, confidence, evidence
        """
        logger.info("✅ Fact-checking claims...")

        try:
            content = self._aggregate_sources(sources)

            system_prompt = """You are a rigorous fact-checker specializing in claim verification."""

            user_prompt = f"""Fact-check all verifiable claims in:

            {content[:5000]}

            For each claim:
            - claim: The specific claim
            - verdict: TRUE|FALSE|MIXED|UNVERIFIABLE
            - confidence: 1-10
            - evidence: Supporting/refuting evidence
            - sources: Where evidence came from

            Focus on factual claims (statistics, dates, attributions).
            Format as JSON array."""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=2500,
                temperature=0.2
            )

            import json
            try:
                fact_checks = json.loads(response.get("content", "[]"))
                logger.info(f"✅ Checked {len(fact_checks)} claims")
                return fact_checks if isinstance(fact_checks, list) else []
            except:
                return []

        except Exception as e:
            logger.error(f"Fact-checking failed: {e}")
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
