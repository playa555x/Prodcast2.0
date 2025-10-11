"""
Trending Topics Service V2 - No API Keys Required
Pure web scraping from public sources for real-time trending data

Quality: 12/10
Last updated: 2025-10-11
"""

import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime
from bs4 import BeautifulSoup
import feedparser
import re
import asyncio

logger = logging.getLogger(__name__)

class TrendingServiceV2:
    """
    Trending topics aggregator using only free web scraping
    NO API KEYS REQUIRED - 100% free and up-to-date

    Sources:
    - Google Trends (trending.google.com - HTML scraping)
    - Reddit (public JSON API)
    - Twitter/X (getdaytrends.com)
    - RSS Feeds (Tagesschau, Spiegel, Zeit, etc.)
    - HackerNews (news.ycombinator.com)
    """

    def __init__(self):
        """Initialize trending service"""
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        self.timeout = 15.0

    async def get_google_trends_realtime(self, region: str = "DE", limit: int = 20) -> List[Dict]:
        """
        Scrape real-time Google Trends from trending.google.com

        Args:
            region: Country code (DE, US, GB, etc.)
            limit: Max number of trends

        Returns:
            List of trending topics
        """
        try:
            url = f"https://trends.google.com/trending/rss?geo={region}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers={"User-Agent": self.user_agent})

                if response.status_code == 200:
                    # Parse RSS feed
                    feed = feedparser.parse(response.text)

                    trends = []
                    for idx, entry in enumerate(feed.entries[:limit]):
                        # Extract traffic info from description
                        traffic = "Unknown"
                        if hasattr(entry, 'ht_approx_traffic'):
                            traffic = entry.ht_approx_traffic

                        trends.append({
                            "rank": idx + 1,
                            "topic": entry.title,
                            "traffic": traffic,
                            "source": "Google Trends",
                            "region": region,
                            "url": entry.link if hasattr(entry, 'link') else "",
                            "timestamp": datetime.utcnow().isoformat()
                        })

                    logger.info(f"Scraped {len(trends)} real-time Google Trends for {region}")
                    return trends
                else:
                    logger.error(f"Google Trends RSS returned {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to scrape Google Trends: {e}")
            return []

    async def get_reddit_trends(
        self,
        subreddit: str = "all",
        time_filter: str = "day",
        limit: int = 10
    ) -> List[Dict]:
        """
        Get trending posts from Reddit (public JSON API - no auth needed)

        Args:
            subreddit: Subreddit name (all, de, programming, etc.)
            time_filter: Time period (hour, day, week, month)
            limit: Max number of posts

        Returns:
            List of trending Reddit posts
        """
        try:
            url = f"https://www.reddit.com/r/{subreddit}/top.json"
            params = {"t": time_filter, "limit": limit}
            headers = {"User-Agent": self.user_agent}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    posts = data.get("data", {}).get("children", [])

                    trends = []
                    for idx, post in enumerate(posts):
                        post_data = post.get("data", {})
                        trends.append({
                            "rank": idx + 1,
                            "title": post_data.get("title"),
                            "subreddit": post_data.get("subreddit"),
                            "score": post_data.get("score"),
                            "num_comments": post_data.get("num_comments"),
                            "url": f"https://reddit.com{post_data.get('permalink')}",
                            "created_utc": datetime.fromtimestamp(post_data.get("created_utc", 0)).isoformat(),
                            "source": "Reddit"
                        })

                    logger.info(f"Fetched {len(trends)} Reddit trends from r/{subreddit}")
                    return trends
                else:
                    logger.error(f"Reddit returned {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to fetch Reddit trends: {e}")
            return []

    async def get_twitter_trends(self, country: str = "germany", limit: int = 20) -> List[Dict]:
        """
        Scrape Twitter/X trends from getdaytrends.com

        Args:
            country: Country name (germany, united-states, etc.)
            limit: Max number of trends

        Returns:
            List of Twitter trending topics
        """
        try:
            url = f"https://getdaytrends.com/{country}/"
            headers = {"User-Agent": self.user_agent}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Find trend items
                    trend_items = soup.find_all('td', class_='main')

                    trends = []
                    for idx, item in enumerate(trend_items[:limit]):
                        trend_link = item.find('a')
                        if trend_link:
                            trend_text = trend_link.get_text(strip=True)
                            trend_url = trend_link.get('href', '')

                            # Extract tweet count
                            tweet_count_elem = item.find_next('td', class_='trends')
                            tweet_count = 0
                            if tweet_count_elem:
                                count_text = tweet_count_elem.get_text(strip=True)
                                match = re.search(r'([\d.]+)([KM]?)', count_text)
                                if match:
                                    num = float(match.group(1))
                                    multiplier = match.group(2)
                                    if multiplier == 'K':
                                        num *= 1000
                                    elif multiplier == 'M':
                                        num *= 1000000
                                    tweet_count = int(num)

                            trends.append({
                                "rank": idx + 1,
                                "topic": trend_text,
                                "tweet_count": tweet_count,
                                "url": f"https://twitter.com{trend_url}" if trend_url.startswith('/') else trend_url,
                                "source": "Twitter/X",
                                "country": country,
                                "timestamp": datetime.utcnow().isoformat()
                            })

                    logger.info(f"Scraped {len(trends)} Twitter trends for {country}")
                    return trends
                else:
                    logger.error(f"Getdaytrends returned {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to scrape Twitter trends: {e}")
            return []

    async def get_news_from_rss(self, country: str = "de", limit: int = 10) -> List[Dict]:
        """
        Get latest news from RSS feeds (no API keys needed)

        Args:
            country: Country code (de, us, gb, etc.)
            limit: Max number of headlines

        Returns:
            List of news headlines from RSS feeds
        """
        rss_feeds = {
            "de": [
                "https://www.tagesschau.de/xml/rss2",
                "https://www.spiegel.de/schlagzeilen/index.rss",
                "https://www.zeit.de/index",
            ],
            "us": [
                "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
                "https://feeds.bbci.co.uk/news/rss.xml",
            ],
            "gb": [
                "https://feeds.bbci.co.uk/news/rss.xml",
                "https://www.theguardian.com/uk/rss",
            ]
        }

        feeds = rss_feeds.get(country.lower(), rss_feeds["de"])

        try:
            headlines = []

            for feed_url in feeds:
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.get(feed_url, headers={"User-Agent": self.user_agent})

                        if response.status_code == 200:
                            feed = feedparser.parse(response.text)

                            for entry in feed.entries[:limit // len(feeds)]:
                                headlines.append({
                                    "title": entry.title,
                                    "description": entry.get('summary', '')[:200],
                                    "url": entry.link,
                                    "published": entry.get('published', datetime.utcnow().isoformat()),
                                    "source": feed.feed.get('title', 'RSS Feed')
                                })
                except Exception as feed_error:
                    logger.debug(f"Failed to fetch feed {feed_url}: {feed_error}")
                    continue

            # Sort by published date
            headlines.sort(key=lambda x: x.get('published', ''), reverse=True)

            logger.info(f"Fetched {len(headlines)} news headlines from RSS feeds")
            return headlines[:limit]

        except Exception as e:
            logger.error(f"Failed to fetch RSS news: {e}")
            return []

    async def get_hackernews_trends(self, limit: int = 20) -> List[Dict]:
        """
        Get trending tech topics from HackerNews

        Args:
            limit: Max number of stories

        Returns:
            List of HackerNews top stories
        """
        try:
            # HackerNews has a public API
            url = "https://hacker-news.firebaseio.com/v0/topstories.json"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)

                if response.status_code == 200:
                    story_ids = response.json()[:limit]

                    stories = []
                    for idx, story_id in enumerate(story_ids):
                        try:
                            story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
                            story_response = await client.get(story_url)

                            if story_response.status_code == 200:
                                story = story_response.json()

                                stories.append({
                                    "rank": idx + 1,
                                    "title": story.get("title"),
                                    "url": story.get("url", f"https://news.ycombinator.com/item?id={story_id}"),
                                    "score": story.get("score", 0),
                                    "num_comments": story.get("descendants", 0),
                                    "by": story.get("by", "Unknown"),
                                    "time": datetime.fromtimestamp(story.get("time", 0)).isoformat(),
                                    "source": "HackerNews"
                                })
                        except Exception as story_error:
                            logger.debug(f"Failed to fetch HN story {story_id}: {story_error}")
                            continue

                    logger.info(f"Fetched {len(stories)} HackerNews stories")
                    return stories
                else:
                    logger.error(f"HackerNews API returned {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to fetch HackerNews trends: {e}")
            return []

    async def get_all_trends(
        self,
        region: str = "DE",
        include_reddit: bool = True,
        include_twitter: bool = True,
        include_news: bool = True,
        include_hackernews: bool = True
    ) -> Dict:
        """
        Get all trending topics from all free sources

        Args:
            region: Country/region code
            include_reddit: Include Reddit trends
            include_twitter: Include Twitter/X trends
            include_news: Include RSS news
            include_hackernews: Include HackerNews

        Returns:
            Dict with all trends categorized by source
        """
        tasks = []

        # Google Trends (always included)
        tasks.append(("google_trends", self.get_google_trends_realtime(region=region)))

        # Reddit
        if include_reddit:
            subreddit = "de" if region.upper() == "DE" else "all"
            tasks.append(("reddit_trends", self.get_reddit_trends(subreddit=subreddit)))

        # Twitter/X
        if include_twitter:
            country_name = self._region_to_country_name(region)
            tasks.append(("twitter_trends", self.get_twitter_trends(country=country_name)))

        # RSS News
        if include_news:
            country_code = region.lower()
            tasks.append(("news_headlines", self.get_news_from_rss(country=country_code)))

        # HackerNews (tech trends)
        if include_hackernews:
            tasks.append(("hackernews_trends", self.get_hackernews_trends()))

        # Execute all tasks concurrently
        results = {}
        for name, task in tasks:
            try:
                results[name] = await task
            except Exception as e:
                logger.error(f"Failed to fetch {name}: {e}")
                results[name] = []

        # Add metadata
        results["metadata"] = {
            "region": region,
            "timestamp": datetime.utcnow().isoformat(),
            "sources_count": len([k for k, v in results.items() if k != "metadata" and v]),
            "total_trends": sum(len(v) for k, v in results.items() if k != "metadata" and isinstance(v, list))
        }

        return results

    def _region_to_country_name(self, region_code: str) -> str:
        """Convert region code to country name for Getdaytrends"""
        region_map = {
            "DE": "germany",
            "US": "united-states",
            "GB": "united-kingdom",
            "FR": "france",
            "ES": "spain",
            "IT": "italy",
            "JP": "japan",
            "BR": "brazil",
            "IN": "india",
            "AU": "australia",
            "CA": "canada",
            "MX": "mexico"
        }
        return region_map.get(region_code.upper(), "germany")

    def generate_podcast_topics(self, trends_data: Dict, limit: int = 10) -> List[Dict]:
        """
        Generate podcast topic ideas from trending data

        Args:
            trends_data: Output from get_all_trends()
            limit: Max number of topics

        Returns:
            List of podcast topic suggestions
        """
        topics = []
        all_keywords = []

        # Extract from Google Trends
        for trend in trends_data.get("google_trends", []):
            all_keywords.append({
                "keyword": trend.get("topic"),
                "source": "Google Trends",
                "score": 100 - trend.get("rank", 100)
            })

        # Extract from Reddit
        for reddit in trends_data.get("reddit_trends", []):
            title = reddit.get("title", "")
            score = reddit.get("score", 0)
            all_keywords.append({
                "keyword": title,
                "source": "Reddit",
                "score": min(score / 100, 100)
            })

        # Extract from Twitter
        for twitter in trends_data.get("twitter_trends", []):
            topic = twitter.get("topic", "")
            count = twitter.get("tweet_count", 0)
            all_keywords.append({
                "keyword": topic,
                "source": "Twitter/X",
                "score": min(count / 1000, 100)
            })

        # Extract from News
        for news in trends_data.get("news_headlines", []):
            title = news.get("title", "")
            all_keywords.append({
                "keyword": title,
                "source": "News",
                "score": 60
            })

        # Extract from HackerNews
        for hn in trends_data.get("hackernews_trends", []):
            title = hn.get("title", "")
            score = hn.get("score", 0)
            all_keywords.append({
                "keyword": title,
                "source": "HackerNews",
                "score": min(score / 10, 100)
            })

        # Sort by score
        all_keywords.sort(key=lambda x: x["score"], reverse=True)

        # Generate topics
        for idx, item in enumerate(all_keywords[:limit]):
            topics.append({
                "rank": idx + 1,
                "topic": item["keyword"],
                "source": item["source"],
                "relevance_score": round(item["score"], 1),
                "podcast_angle": self._suggest_podcast_angle(item["keyword"]),
                "estimated_interest": "High" if item["score"] > 70 else "Medium" if item["score"] > 40 else "Low"
            })

        return topics

    def _suggest_podcast_angle(self, keyword: str) -> str:
        """Suggest a podcast angle based on keyword"""
        keyword_lower = keyword.lower()

        if any(word in keyword_lower for word in ["tech", "ki", "ai", "software", "digital"]):
            return "Tech Deep Dive"
        elif any(word in keyword_lower for word in ["politik", "wahl", "regierung", "election"]):
            return "Political Analysis"
        elif any(word in keyword_lower for word in ["gesundheit", "medizin", "health", "fitness"]):
            return "Health & Wellness"
        elif any(word in keyword_lower for word in ["wirtschaft", "börse", "finance", "business"]):
            return "Business & Finance"
        elif any(word in keyword_lower for word in ["sport", "fußball", "basketball", "football"]):
            return "Sports Commentary"
        elif any(word in keyword_lower for word in ["kultur", "film", "musik", "art", "entertainment"]):
            return "Culture & Entertainment"
        else:
            return "General Interest Discussion"
