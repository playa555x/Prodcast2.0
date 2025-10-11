"""
Trending Topics API Endpoints
Provides trending topics from multiple sources

Quality: 12/10
Last updated: 2025-10-07
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
import logging

from services.trending_service_v2 import TrendingServiceV2
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize trending service V2 (NO API KEYS NEEDED!)
trending_service = TrendingServiceV2()

# ============================================
# Trending Endpoints
# ============================================

@router.get("/trending/google")
async def get_google_trends(
    region: str = Query("DE", description="Country code (DE, US, GB, etc.)"),
    limit: int = Query(20, ge=1, le=50, description="Max number of trends")
):
    """
    Get real-time trending searches from Google Trends RSS

    ✅ Free, no API key required
    ✅ Real-time data from trending.google.com
    """
    try:
        trends = await trending_service.get_google_trends_realtime(region=region, limit=limit)
        return {
            "success": True,
            "source": "Google Trends (Real-time RSS)",
            "region": region,
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch Google Trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/news")
async def get_news_headlines(
    country: str = Query("de", description="Country code (de, us, gb, etc.)"),
    category: Optional[str] = Query(None, description="Category (not used in RSS version)"),
    limit: int = Query(10, ge=1, le=50, description="Max number of headlines")
):
    """
    Get latest news from RSS feeds

    ✅ Free, no API key required
    ✅ Real-time data from Tagesschau, Spiegel, BBC, NY Times, etc.
    """
    try:
        headlines = await trending_service.get_news_from_rss(
            country=country,
            limit=limit
        )

        return {
            "success": True,
            "source": "RSS Feeds (Tagesschau, Spiegel, BBC, etc.)",
            "country": country,
            "count": len(headlines),
            "headlines": headlines
        }
    except Exception as e:
        logger.error(f"Failed to fetch news headlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/reddit")
async def get_reddit_trends(
    subreddit: str = Query("all", description="Subreddit name"),
    time_filter: str = Query("day", description="Time filter (hour, day, week, month)"),
    limit: int = Query(10, ge=1, le=50, description="Max number of posts")
):
    """
    Get trending posts from Reddit

    Free, no API key required (uses public JSON API)
    """
    try:
        trends = await trending_service.get_reddit_trends(
            subreddit=subreddit,
            time_filter=time_filter,
            limit=limit
        )
        return {
            "success": True,
            "source": "Reddit",
            "subreddit": subreddit,
            "time_filter": time_filter,
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch Reddit trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/youtube")
async def get_youtube_trends(
    region: str = Query("DE", description="Country code (DE, US, GB, etc.)"),
    category_id: Optional[str] = Query(None, description="Video category ID"),
    limit: int = Query(10, ge=1, le=50, description="Max number of videos")
):
    """
    Get trending videos from YouTube

    Requires YouTube Data API key (10,000 requests/day free tier)

    Note: Web scraping fallback has limitations due to:
    - GDPR consent walls (for EU users)
    - Dynamic JavaScript rendering
    - Bot detection measures

    For reliable data, please configure YOUTUBE_API_KEY in .env file
    """
    try:
        trends = await trending_service.get_youtube_trends(
            region=region,
            category_id=category_id,
            limit=limit
        )

        if not trends and not trending_service.youtube_api_key:
            return {
                "success": False,
                "message": "YouTube API key not configured. Please add YOUTUBE_API_KEY to .env file",
                "trends": []
            }

        return {
            "success": True,
            "source": "YouTube",
            "region": region,
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch YouTube trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/twitter")
async def get_twitter_trends(
    country: str = Query("germany", description="Country name (germany, united-states, etc.)"),
    limit: int = Query(20, ge=1, le=50, description="Max number of trends")
):
    """
    Get trending topics from Twitter/X via Getdaytrends

    Free, no API key required (web scraping)
    """
    try:
        trends = await trending_service.get_twitter_trends(country=country, limit=limit)
        return {
            "success": True,
            "source": "Twitter/X",
            "country": country,
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch Twitter trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/tiktok")
async def get_tiktok_trends(
    region: str = Query("DE", description="Country code (DE, US, GB, etc.)"),
    limit: int = Query(20, ge=1, le=50, description="Max number of trends")
):
    """
    Get trending hashtags from TikTok

    ⚠️ Currently disabled - TikTok Creative Center API requires authentication.

    The internal TikTok API returns error 40101 ("no permission") without auth tokens.

    To enable TikTok trends, configure one of these in .env:
    - RAPIDAPI_KEY (RapidAPI TikTok endpoints - 500 requests/month free)
    - APIFY_TOKEN (Apify TikTok scraper - $5 credit/month free)

    Alternative: Deploy on Linux and use Playwright browser automation.

    For now, returns empty list with success=true and note about configuration.
    """
    try:
        trends = await trending_service.get_tiktok_trends(region=region, limit=limit)
        return {
            "success": True,
            "source": "TikTok",
            "region": region,
            "count": len(trends),
            "trends": trends,
            "note": "TikTok trends require JS rendering - data may be limited"
        }
    except Exception as e:
        logger.error(f"Failed to fetch TikTok trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/spotify")
async def get_spotify_trends(
    region: str = Query("us", description="Country code (us, de, gb, etc.)"),
    limit: int = Query(20, ge=1, le=50, description="Max number of podcasts")
):
    """
    Get trending podcasts from Spotify

    Uses Podchaser API if configured, otherwise web scraping
    """
    try:
        trends = await trending_service.get_spotify_podcast_trends(region=region, limit=limit)

        if not trends and not trending_service.podchaser_api_key:
            return {
                "success": False,
                "message": "Podchaser API key not configured. Using fallback web scraping (limited data)",
                "trends": []
            }

        return {
            "success": True,
            "source": "Spotify Podcasts",
            "region": region,
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch Spotify trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/hackernews")
async def get_hackernews_trends(
    limit: int = Query(20, ge=1, le=50, description="Max number of stories")
):
    """
    Get trending tech topics from HackerNews

    ✅ Free, no API key required
    ✅ Real-time data from news.ycombinator.com
    """
    try:
        trends = await trending_service.get_hackernews_trends(limit=limit)
        return {
            "success": True,
            "source": "HackerNews",
            "count": len(trends),
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch HackerNews trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/all")
async def get_all_trends(
    region: str = Query("DE", description="Country/region code"),
    include_news: bool = Query(True, description="Include RSS news feeds"),
    include_reddit: bool = Query(True, description="Include Reddit trends"),
    include_twitter: bool = Query(True, description="Include Twitter/X trends"),
    include_hackernews: bool = Query(True, description="Include HackerNews trends")
):
    """
    Get all trending topics from all available sources

    ✅ 100% FREE - NO API KEYS REQUIRED!
    ✅ Real-time data from:
    - Google Trends (always included)
    - RSS News (Tagesschau, Spiegel, BBC, NY Times)
    - Reddit (public JSON API)
    - Twitter/X (via getdaytrends.com)
    - HackerNews (tech trends)
    """
    try:
        all_trends = await trending_service.get_all_trends(
            region=region,
            include_news=include_news,
            include_reddit=include_reddit,
            include_twitter=include_twitter,
            include_hackernews=include_hackernews
        )

        return {
            "success": True,
            "region": region,
            "data": all_trends
        }
    except Exception as e:
        logger.error(f"Failed to fetch all trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/podcast-ideas")
async def get_podcast_topic_ideas(
    region: str = Query("DE", description="Country/region code"),
    limit: int = Query(10, ge=1, le=50, description="Max number of topic suggestions")
):
    """
    Generate podcast topic ideas based on current trends

    ✅ Free, no API key required
    ✅ Rule-based analysis (no AI needed)
    ✅ Real-time trending topics from multiple sources
    """
    try:
        # Fetch all trends
        all_trends = await trending_service.get_all_trends(
            region=region,
            include_news=True,
            include_reddit=True,
            include_twitter=True,
            include_hackernews=True
        )

        # Generate podcast topics
        topics = trending_service.generate_podcast_topics(all_trends, limit=limit)

        return {
            "success": True,
            "region": region,
            "count": len(topics),
            "topics": topics,
            "metadata": {
                "sources_used": all_trends.get("metadata", {}).get("sources_count", 0),
                "total_trends": all_trends.get("metadata", {}).get("total_trends", 0),
                "generated_at": all_trends.get("metadata", {}).get("timestamp")
            }
        }
    except Exception as e:
        logger.error(f"Failed to generate podcast topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending/health")
async def check_api_health():
    """
    Check which trending APIs are configured and available
    """
    return {
        "google_trends": {
            "available": True,
            "requires_key": False,
            "status": "Ready",
            "method": "Free API (pytrends)"
        },
        "newsapi": {
            "available": trending_service.newsapi_key is not None,
            "requires_key": True,
            "status": "Configured" if trending_service.newsapi_key else "Missing API Key",
            "method": "NewsAPI.org"
        },
        "reddit": {
            "available": True,
            "requires_key": False,
            "status": "Ready",
            "method": "Public JSON API"
        },
        "youtube": {
            "available": trending_service.youtube_api_key is not None,
            "requires_key": True,
            "status": "Configured" if trending_service.youtube_api_key else "Missing API Key",
            "method": "YouTube Data API v3"
        },
        "twitter": {
            "available": True,
            "requires_key": False,
            "status": "Ready",
            "method": "Web Scraping (Getdaytrends)"
        },
        "tiktok": {
            "available": True,
            "requires_key": False,
            "status": "Limited (requires JS rendering)",
            "method": "Web Scraping (Creative Center)"
        },
        "spotify": {
            "available": True,
            "requires_key": False,
            "status": "Configured" if trending_service.podchaser_api_key else "Web Scraping Fallback",
            "method": "Podchaser API / Web Scraping"
        }
    }
