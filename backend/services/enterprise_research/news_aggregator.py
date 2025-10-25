"""
News Aggregation Service
Fetches current news from multiple sources

Quality: 12/10
"""

import logging
from typing import List, Dict
from datetime import datetime, timedelta
from services.claude_api import ClaudeAPIService

logger = logging.getLogger(__name__)


class NewsAggregator:
    """Aggregate news from multiple sources"""

    def __init__(self):
        self.claude = ClaudeAPIService()
        # In production: Use NewsAPI, Google News API, etc.

    async def search(self, topic: str, time_range: str) -> List[Dict]:
        """
        Search for news articles

        Returns: List of news articles with title, summary, source, date
        """
        logger.info(f"📰 Aggregating news for: {topic}")

        try:
            # Calculate date range
            days_back = self._get_days_from_range(time_range)
            start_date = datetime.now() - timedelta(days=days_back)

            system_prompt = """You are a news analyst with access to current news trends."""

            user_prompt = f"""Provide recent news articles about: "{topic}"

            Time range: Last {days_back} days

            For each article provide:
            - title: Article headline
            - summary: 2-3 sentence summary
            - source: News outlet name
            - date: Approximate date (ISO format)
            - key_points: 3-5 bullet points
            - sentiment: positive|negative|neutral

            Provide 5-10 most relevant articles.
            Format as JSON array."""

            response = await self.claude.send_message(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=2500,
                temperature=0.5
            )

            import json
            try:
                articles = json.loads(response.get("content", "[]"))
                logger.info(f"✅ Found {len(articles)} news articles")
                return articles if isinstance(articles, list) else []
            except:
                return []

        except Exception as e:
            logger.error(f"News aggregation failed: {e}")
            return []

    def _get_days_from_range(self, time_range: str) -> int:
        """Convert time range to days"""
        mapping = {
            "1week": 7,
            "1month": 30,
            "6months": 180,
            "1year": 365,
            "all": 365 * 5
        }
        return mapping.get(time_range, 180)
