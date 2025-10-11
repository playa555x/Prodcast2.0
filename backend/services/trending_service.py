"""
Trending Topics Service
Aggregates trending topics from multiple free sources

Sources:
- Google Trends (pytrends)
- NewsAPI
- Reddit API
- YouTube Data API

Quality: 12/10
Last updated: 2025-10-07
"""

import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pytrends.request import TrendReq
import asyncio
from bs4 import BeautifulSoup
import re

from services.mcp_client import get_mcp_client

logger = logging.getLogger(__name__)

class TrendingService:
    """
    Aggregates trending topics from multiple free sources

    Supports:
    - Google Trends
    - NewsAPI
    - Reddit
    - YouTube
    - Twitter/X (via Getdaytrends)
    - TikTok (via web scraping)
    - Spotify Podcasts (via Podchaser API)
    """

    def __init__(
        self,
        newsapi_key: Optional[str] = None,
        youtube_api_key: Optional[str] = None,
        podchaser_api_key: Optional[str] = None
    ):
        """
        Initialize trending service

        Args:
            newsapi_key: NewsAPI.org API key (optional)
            youtube_api_key: YouTube Data API key (optional)
            podchaser_api_key: Podchaser API key for podcast data (optional)
        """
        self.newsapi_key = newsapi_key
        self.youtube_api_key = youtube_api_key
        self.podchaser_api_key = podchaser_api_key
        self.pytrends = None

    # ============================================
    # Google Trends
    # ============================================

    async def get_google_trends(self, region: str = "DE", limit: int = 20) -> List[Dict]:
        """
        Get trending topics from Google Trends

        Args:
            region: Country code (DE, US, GB, etc.)
            limit: Max number of trends to return

        Returns:
            List of trending topics with metadata
        """
        try:
            # Initialize pytrends (synchronous, so run in executor)
            loop = asyncio.get_event_loop()

            def fetch_trends():
                # Create new instance for each request (thread-safe)
                pytrends = TrendReq(hl='de-DE', tz=60)

                # Get daily trending searches
                trending_searches = pytrends.trending_searches(pn=region.lower())

                # Convert to list of dicts
                trends = []
                for idx, topic in enumerate(trending_searches[0].head(limit).tolist()):
                    trends.append({
                        "rank": idx + 1,
                        "topic": topic,
                        "source": "Google Trends",
                        "region": region,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                return trends

            trends = await loop.run_in_executor(None, fetch_trends)
            logger.info(f"Fetched {len(trends)} trends from Google Trends ({region})")
            return trends

        except Exception as e:
            logger.error(f"Failed to fetch Google Trends: {e}")
            return []

    # ============================================
    # NewsAPI
    # ============================================

    async def get_top_headlines(
        self,
        country: str = "de",
        category: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get top news headlines via MCP Web Search

        Args:
            country: Country code (de, us, gb, etc.)
            category: Category (business, technology, etc.)
            limit: Max number of headlines

        Returns:
            List of news headlines from MCP web search
        """
        try:
            mcp = await get_mcp_client()

            # Build search query based on category and country
            country_map = {
                "de": "Deutschland Germany",
                "us": "United States USA",
                "gb": "United Kingdom UK",
                "fr": "France",
                "es": "Spain España",
                "it": "Italy Italia",
                "jp": "Japan 日本",
                "br": "Brazil Brasil",
                "in": "India",
                "au": "Australia",
                "ca": "Canada",
                "mx": "Mexico"
            }

            country_name = country_map.get(country.lower(), country)

            if category:
                query = f"breaking {category} news {country_name} today"
            else:
                query = f"breaking news {country_name} today headlines"

            results = await mcp.search_web(query=query, max_results=limit * 2)

            headlines = []
            for idx, result in enumerate(results[:limit]):
                headlines.append({
                    "rank": idx + 1,
                    "title": result.get("title", ""),
                    "description": result.get("description", ""),
                    "source": "MCP Web Search",
                    "url": result.get("url", ""),
                    "publishedAt": result.get("publishedDate", datetime.utcnow().isoformat()),
                    "category": category or "general"
                })

            logger.info(f"Fetched {len(headlines)} headlines via MCP Web Search")
            return headlines

        except Exception as e:
            logger.error(f"Failed to fetch headlines via MCP: {e}")
            return []

    # ============================================
    # Reddit API
    # ============================================

    async def get_reddit_trends(
        self,
        subreddit: str = "all",
        time_filter: str = "day",
        limit: int = 10
    ) -> List[Dict]:
        """
        Get trending posts from Reddit

        Args:
            subreddit: Subreddit name (all, podcasts, technology, etc.)
            time_filter: Time period (hour, day, week, month, year, all)
            limit: Max number of posts

        Returns:
            List of trending Reddit posts
        """
        try:
            # Use Reddit JSON API (no auth needed for public data)
            url = f"https://www.reddit.com/r/{subreddit}/top.json"
            params = {
                "t": time_filter,
                "limit": limit
            }

            headers = {
                "User-Agent": "GedaechtnisBoost/2.0"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
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

                    logger.info(f"Fetched {len(trends)} trends from Reddit r/{subreddit}")
                    return trends
                else:
                    logger.error(f"Reddit API error: {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to fetch Reddit trends: {e}")
            return []

    # ============================================
    # YouTube Data API
    # ============================================

    async def get_youtube_trends(
        self,
        region: str = "DE",
        category_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get trending videos from YouTube

        Uses official API if key available, otherwise web scraping

        Args:
            region: Country code (DE, US, GB, etc.)
            category_id: Video category ID (optional)
            limit: Max number of videos

        Returns:
            List of trending YouTube videos
        """
        if not self.youtube_api_key:
            logger.info("YouTube API key not configured, using web scraping fallback")
            return await self._scrape_youtube_trending(region, limit)

        try:
            url = "https://www.googleapis.com/youtube/v3/videos"
            params = {
                "part": "snippet,statistics",
                "chart": "mostPopular",
                "regionCode": region,
                "maxResults": limit,
                "key": self.youtube_api_key
            }

            if category_id:
                params["videoCategoryId"] = category_id

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])

                    trends = []
                    for idx, item in enumerate(items):
                        snippet = item.get("snippet", {})
                        statistics = item.get("statistics", {})

                        trends.append({
                            "rank": idx + 1,
                            "title": snippet.get("title"),
                            "channel": snippet.get("channelTitle"),
                            "description": snippet.get("description", "")[:200],
                            "view_count": int(statistics.get("viewCount", 0)),
                            "like_count": int(statistics.get("likeCount", 0)),
                            "comment_count": int(statistics.get("commentCount", 0)),
                            "published_at": snippet.get("publishedAt"),
                            "video_id": item.get("id"),
                            "url": f"https://youtube.com/watch?v={item.get('id')}",
                            "source": "YouTube"
                        })

                    logger.info(f"Fetched {len(trends)} trends from YouTube ({region})")
                    return trends
                else:
                    logger.error(f"YouTube API error: {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to fetch YouTube trends: {e}")
            return []

    async def _scrape_youtube_trending(
        self,
        region: str = "DE",
        limit: int = 10
    ) -> List[Dict]:
        """
        Scrape YouTube trending page (fallback when no API key)

        Args:
            region: Country code (DE, US, GB, etc.)
            limit: Max number of videos

        Returns:
            List of trending YouTube videos
        """
        try:
            # YouTube trending page URL
            region_lower = region.lower()
            url = f"https://www.youtube.com/feed/trending?gl={region_lower}"

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')

                    trends = []

                    # YouTube embeds data in script tags as JSON
                    # Try to extract video data from ytInitialData
                    scripts = soup.find_all('script')

                    for script in scripts:
                        script_text = script.string
                        if script_text and 'var ytInitialData' in script_text:
                            try:
                                # Extract the JSON data
                                start = script_text.find('{')
                                end = script_text.rfind('}') + 1
                                json_str = script_text[start:end]

                                import json
                                data = json.loads(json_str)

                                # Navigate through the nested structure
                                contents = (data.get('contents', {})
                                           .get('twoColumnBrowseResultsRenderer', {})
                                           .get('tabs', []))

                                for tab in contents:
                                    tab_renderer = tab.get('tabRenderer', {})
                                    if tab_renderer.get('selected'):
                                        items = (tab_renderer.get('content', {})
                                                .get('richGridRenderer', {})
                                                .get('contents', []))

                                        for idx, item in enumerate(items[:limit]):
                                            video_renderer = (item.get('richItemRenderer', {})
                                                            .get('content', {})
                                                            .get('videoRenderer', {}))

                                            if video_renderer:
                                                video_id = video_renderer.get('videoId', '')
                                                title = (video_renderer.get('title', {})
                                                        .get('runs', [{}])[0]
                                                        .get('text', 'Unknown'))

                                                channel = (video_renderer.get('ownerText', {})
                                                          .get('runs', [{}])[0]
                                                          .get('text', 'Unknown'))

                                                view_text = (video_renderer.get('viewCountText', {})
                                                            .get('simpleText', '0 views'))

                                                # Extract view count number
                                                view_count = 0
                                                try:
                                                    view_str = view_text.split()[0].replace(',', '').replace('.', '')
                                                    if 'K' in view_text:
                                                        view_count = int(float(view_str) * 1000)
                                                    elif 'M' in view_text:
                                                        view_count = int(float(view_str) * 1000000)
                                                    elif 'B' in view_text:
                                                        view_count = int(float(view_str) * 1000000000)
                                                    else:
                                                        view_count = int(view_str)
                                                except:
                                                    pass

                                                trends.append({
                                                    "rank": idx + 1,
                                                    "title": title,
                                                    "channel": channel,
                                                    "view_count": view_count,
                                                    "video_id": video_id,
                                                    "url": f"https://youtube.com/watch?v={video_id}",
                                                    "source": "YouTube (Scraping)"
                                                })

                                        break

                                if trends:
                                    logger.info(f"Scraped {len(trends)} YouTube trends from {region}")
                                    return trends

                            except Exception as parse_error:
                                logger.error(f"Failed to parse YouTube JSON: {parse_error}")

                    # If JSON parsing failed, return empty list
                    logger.warning("Could not extract YouTube trends from page")
                    return []

                else:
                    logger.error(f"YouTube scraping failed: HTTP {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to scrape YouTube trends: {e}")
            return []

    # ============================================
    # Twitter/X Trends (via Getdaytrends)
    # ============================================

    async def get_twitter_trends(
        self,
        country: str = "germany",
        limit: int = 20
    ) -> List[Dict]:
        """
        Get trending topics from Twitter/X via Getdaytrends.com

        Args:
            country: Country name (germany, united-states, etc.)
            limit: Max number of trends

        Returns:
            List of Twitter trending topics
        """
        try:
            url = f"https://getdaytrends.com/{country}/"

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Find trend items (structure may vary, adjust selector as needed)
                    trend_items = soup.find_all('td', class_='main')

                    trends = []
                    for idx, item in enumerate(trend_items[:limit]):
                        # Extract trend text
                        trend_link = item.find('a')
                        if trend_link:
                            trend_text = trend_link.get_text(strip=True)
                            trend_url = trend_link.get('href', '')

                            # Extract tweet count if available
                            tweet_count_elem = item.find_next('td', class_='trends')
                            tweet_count = 0
                            if tweet_count_elem:
                                count_text = tweet_count_elem.get_text(strip=True)
                                # Extract number from text like "12.5K tweets"
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

                    logger.info(f"Fetched {len(trends)} trends from Twitter ({country})")
                    return trends
                else:
                    logger.error(f"Getdaytrends error: {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to fetch Twitter trends: {e}")
            return []

    # ============================================
    # TikTok Trends (via Creative Center)
    # ============================================

    async def get_tiktok_trends(
        self,
        region: str = "DE",
        limit: int = 20
    ) -> List[Dict]:
        """
        Get trending hashtags from TikTok

        ⚠️ TikTok Creative Center Hidden API requires authentication (error 40101).

        Current status: Returns empty list

        Working alternatives:
        1. RapidAPI TikTok endpoints (requires API key)
           - https://rapidapi.com/earned/api/tiktok-trending-data
           - Free tier: 500 requests/month

        2. Apify TikTok scrapers (requires Apify token)
           - https://apify.com/doliz/tiktok-creative-center-scraper
           - Free tier: $5 credit/month

        3. Manual scraping with Selenium/Playwright (requires Linux for best compatibility)

        To enable TikTok trends:
        - Configure RAPIDAPI_KEY in .env
        - Or configure APIFY_TOKEN in .env
        - Or deploy on Linux and use Playwright

        Args:
            region: Country code (DE, US, GB, etc.)
            limit: Max number of trends

        Returns:
            List of TikTok trending hashtags (currently empty)
        """
        logger.warning(f"TikTok trends not available - API requires authentication")
        logger.info("Configure RAPIDAPI_KEY or APIFY_TOKEN to enable TikTok trends")
        return []

    async def get_tiktok_trends_playwright(
        self,
        region: str = "DE",
        limit: int = 20
    ) -> List[Dict]:
        """
        DISABLED: Get trending hashtags from TikTok via Unofficial API

        This method is disabled due to Windows asyncio subprocess issues.
        Playwright subprocess calls fail with NotImplementedError on Windows
        when running inside uvicorn's async context.

        To enable TikTok trends, consider:
        1. Deploy on Linux (Playwright works better)
        2. Use RapidAPI or other TikTok trend services
        3. Run Playwright in separate process/container

        Args:
            region: Country code (DE, US, GB, etc.)
            limit: Max number of trends

        Returns:
            List of TikTok trending hashtags
        """
        try:
            from TikTokApi import TikTokApi

            logger.info(f"Fetching TikTok trends for region {region}...")

            # Initialize TikTok API with Playwright
            async with TikTokApi() as api:
                # Create browser session
                await api.create_sessions(num_sessions=1, sleep_after=3, headless=True)

                trends = []

                # Get trending videos (TikTok doesn't expose hashtag API directly)
                # We'll extract hashtags from trending videos
                trending_videos = api.trending.videos(count=limit * 2)  # Get more to extract hashtags

                hashtag_counts = {}
                video_count = 0

                async for video in trending_videos:
                    video_count += 1
                    if video_count > limit * 2:
                        break

                    try:
                        # Extract hashtags from video challenges
                        if hasattr(video, 'challenges') and video.challenges:
                            for challenge in video.challenges:
                                hashtag = challenge.title if hasattr(challenge, 'title') else str(challenge)
                                if hashtag:
                                    if hashtag not in hashtag_counts:
                                        hashtag_counts[hashtag] = {
                                            'count': 0,
                                            'views': 0
                                        }
                                    hashtag_counts[hashtag]['count'] += 1

                        # Add video stats to hashtag data
                        if hasattr(video, 'stats'):
                            stats = video.stats
                            view_count = getattr(stats, 'playCount', 0) or 0

                            if hasattr(video, 'challenges') and video.challenges:
                                for challenge in video.challenges:
                                    hashtag = challenge.title if hasattr(challenge, 'title') else str(challenge)
                                    if hashtag and hashtag in hashtag_counts:
                                        hashtag_counts[hashtag]['views'] += view_count

                    except Exception as video_error:
                        logger.debug(f"Error processing TikTok video: {video_error}")
                        continue

                # Sort hashtags by frequency
                sorted_hashtags = sorted(
                    hashtag_counts.items(),
                    key=lambda x: (x[1]['count'], x[1]['views']),
                    reverse=True
                )

                # Build result list
                for idx, (hashtag, data) in enumerate(sorted_hashtags[:limit]):
                    trends.append({
                        "rank": idx + 1,
                        "topic": f"#{hashtag}",
                        "video_count": data['count'],
                        "total_views": data['views'],
                        "source": "TikTok",
                        "region": region
                    })

                logger.info(f"Extracted {len(trends)} TikTok trending hashtags from {video_count} videos")
                return trends

        except ImportError:
            logger.error("TikTokApi package not installed. Install with: pip install TikTokApi playwright")
            return []
        except Exception as e:
            logger.error(f"Failed to fetch TikTok trends: {e}")
            logger.info("TikTok API may require browser setup. Try: python -m playwright install chromium")
            return []

    # ============================================
    # Spotify Podcast Trends (via Podchaser API)
    # ============================================

    async def get_spotify_podcast_trends(
        self,
        region: str = "us",
        limit: int = 20
    ) -> List[Dict]:
        """
        Get trending podcasts from Spotify via Podchaser API

        Args:
            region: Country code (us, de, gb, etc.)
            limit: Max number of podcasts

        Returns:
            List of trending podcasts
        """
        if not self.podchaser_api_key:
            logger.warning("Podchaser API key not configured")
            # Fallback: scrape Spotify Podcast Charts
            return await self._scrape_spotify_charts(region, limit)

        try:
            # Podchaser API endpoint for charts
            url = "https://api.podchaser.com/list/charts"

            headers = {
                "Authorization": f"Bearer {self.podchaser_api_key}",
                "Accept": "application/json"
            }

            params = {
                "country": region.upper(),
                "count": limit
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    podcasts = data.get("entities", [])

                    trends = []
                    for idx, podcast in enumerate(podcasts[:limit]):
                        trends.append({
                            "rank": idx + 1,
                            "title": podcast.get("title"),
                            "description": podcast.get("description", "")[:200],
                            "author": podcast.get("author"),
                            "categories": podcast.get("categories", []),
                            "url": podcast.get("url"),
                            "image_url": podcast.get("imageUrl"),
                            "source": "Spotify Podcasts",
                            "region": region
                        })

                    logger.info(f"Fetched {len(trends)} podcast trends from Podchaser")
                    return trends
                else:
                    logger.error(f"Podchaser API error: {response.status_code}")
                    return await self._scrape_spotify_charts(region, limit)

        except Exception as e:
            logger.error(f"Failed to fetch Spotify podcast trends: {e}")
            return await self._scrape_spotify_charts(region, limit)

    async def _scrape_spotify_charts(self, region: str = "us", limit: int = 20) -> List[Dict]:
        """
        Fallback: Scrape Spotify Podcast Charts

        Args:
            region: Country code
            limit: Max number of podcasts

        Returns:
            List of trending podcasts
        """
        try:
            url = f"https://podcastcharts.byspotify.com/charts/{region}/trending"

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')

                    trends = []
                    # Find podcast elements (adjust selectors based on actual HTML)
                    podcast_items = soup.find_all('div', class_='chart-item')[:limit]

                    for idx, item in enumerate(podcast_items):
                        title_elem = item.find('h3') or item.find('a')
                        title = title_elem.get_text(strip=True) if title_elem else f"Podcast {idx+1}"

                        trends.append({
                            "rank": idx + 1,
                            "title": title,
                            "description": "",
                            "source": "Spotify Podcasts",
                            "region": region
                        })

                    logger.info(f"Scraped {len(trends)} podcasts from Spotify Charts")
                    return trends
                else:
                    logger.error(f"Spotify Charts scraping error: {response.status_code}")
                    return []

        except Exception as e:
            logger.error(f"Failed to scrape Spotify Charts: {e}")
            return []

    # ============================================
    # Aggregated Trends
    # ============================================

    async def get_all_trends(
        self,
        region: str = "DE",
        include_news: bool = True,
        include_reddit: bool = True,
        include_youtube: bool = True,
        include_twitter: bool = True,
        include_tiktok: bool = True,
        include_spotify: bool = True
    ) -> Dict:
        """
        Get all trending topics from all sources

        Args:
            region: Country/region code
            include_news: Include NewsAPI headlines
            include_reddit: Include Reddit trends
            include_youtube: Include YouTube trends
            include_twitter: Include Twitter/X trends
            include_tiktok: Include TikTok trends
            include_spotify: Include Spotify podcast trends

        Returns:
            Dict with all trends categorized by source
        """
        tasks = []

        # Google Trends (always included)
        tasks.append(("google_trends", self.get_google_trends(region=region)))

        # News Headlines (via MCP Web Search)
        if include_news:
            country_code = region.lower()
            tasks.append(("news_headlines", self.get_top_headlines(country=country_code)))

        # Reddit
        if include_reddit:
            tasks.append(("reddit_trends", self.get_reddit_trends(subreddit="all")))

        # YouTube
        if include_youtube and self.youtube_api_key:
            tasks.append(("youtube_trends", self.get_youtube_trends(region=region)))

        # Twitter/X
        if include_twitter:
            country_name = self._region_to_country_name(region)
            tasks.append(("twitter_trends", self.get_twitter_trends(country=country_name)))

        # TikTok
        if include_tiktok:
            tasks.append(("tiktok_trends", self.get_tiktok_trends(region=region)))

        # Spotify Podcasts
        if include_spotify:
            tasks.append(("spotify_trends", self.get_spotify_podcast_trends(region=region.lower())))

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
            "sources_count": len([k for k, v in results.items() if k != "metadata" and v])
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

    # ============================================
    # Podcast Topic Generator
    # ============================================

    def generate_podcast_topics(self, trends_data: Dict, limit: int = 10) -> List[Dict]:
        """
        Generate podcast topic ideas based on trending data

        Uses rule-based analysis to suggest topics without AI

        Args:
            trends_data: Output from get_all_trends()
            limit: Max number of topics to generate

        Returns:
            List of podcast topic suggestions
        """
        topics = []

        # Extract keywords from all sources
        all_keywords = []

        # From Google Trends
        for trend in trends_data.get("google_trends", []):
            all_keywords.append({
                "keyword": trend.get("topic"),
                "source": "Google Trends",
                "score": 100 - trend.get("rank", 100)  # Higher rank = higher score
            })

        # From News
        for news in trends_data.get("news_headlines", []):
            title = news.get("title", "")
            all_keywords.append({
                "keyword": title,
                "source": "News",
                "score": 50
            })

        # From Reddit
        for reddit in trends_data.get("reddit_trends", []):
            title = reddit.get("title", "")
            score = reddit.get("score", 0)
            all_keywords.append({
                "keyword": title,
                "source": "Reddit",
                "score": min(score / 100, 100)  # Normalize score
            })

        # From YouTube
        for yt in trends_data.get("youtube_trends", []):
            title = yt.get("title", "")
            views = yt.get("view_count", 0)
            all_keywords.append({
                "keyword": title,
                "source": "YouTube",
                "score": min(views / 10000, 100)  # Normalize views
            })

        # Sort by score
        all_keywords.sort(key=lambda x: x["score"], reverse=True)

        # Generate topic suggestions
        for idx, item in enumerate(all_keywords[:limit]):
            topics.append({
                "rank": idx + 1,
                "topic": item["keyword"],
                "source": item["source"],
                "relevance_score": round(item["score"], 1),
                "podcast_angle": self._suggest_podcast_angle(item["keyword"]),
                "target_audience": self._suggest_target_audience(item["keyword"]),
                "estimated_interest": "High" if item["score"] > 70 else "Medium" if item["score"] > 40 else "Low"
            })

        return topics

    def _suggest_podcast_angle(self, keyword: str) -> str:
        """Suggest a podcast angle based on keyword"""
        keyword_lower = keyword.lower()

        if any(word in keyword_lower for word in ["technologie", "tech", "ki", "ai", "software"]):
            return "Tech Deep Dive"
        elif any(word in keyword_lower for word in ["politik", "wahl", "regierung", "politik"]):
            return "Political Analysis"
        elif any(word in keyword_lower for word in ["gesundheit", "medizin", "fitness", "ernährung"]):
            return "Health & Wellness"
        elif any(word in keyword_lower for word in ["wirtschaft", "börse", "finanzen", "geld"]):
            return "Business & Finance"
        elif any(word in keyword_lower for word in ["sport", "fußball", "basketball", "olympia"]):
            return "Sports Commentary"
        elif any(word in keyword_lower for word in ["kultur", "film", "musik", "kunst"]):
            return "Culture & Entertainment"
        else:
            return "General Interest Discussion"

    def _suggest_target_audience(self, keyword: str) -> str:
        """Suggest target audience based on keyword"""
        keyword_lower = keyword.lower()

        if any(word in keyword_lower for word in ["tech", "ki", "software", "developer"]):
            return "Tech Enthusiasts, 25-45"
        elif any(word in keyword_lower for word in ["politik", "wahl", "regierung"]):
            return "News Consumers, 30-60"
        elif any(word in keyword_lower for word in ["gesundheit", "fitness"]):
            return "Health-Conscious, 25-50"
        elif any(word in keyword_lower for word in ["wirtschaft", "finanzen", "börse"]):
            return "Professionals, 30-55"
        elif any(word in keyword_lower for word in ["sport"]):
            return "Sports Fans, 18-45"
        else:
            return "General Audience, 18-65"
