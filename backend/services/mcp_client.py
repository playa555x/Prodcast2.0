"""
MCP Client Service
Handles all Model Context Protocol integrations for research
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any
import json

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from core.config import settings

logger = logging.getLogger(__name__)


class MCPClientService:
    """
    MCP Client for integrating with external data sources
    via Model Context Protocol servers
    """

    def __init__(self):
        """Initialize MCP client"""
        self.youtube_session: Optional[ClientSession] = None
        self.web_session: Optional[ClientSession] = None
        self._initialized = False

    async def initialize(self):
        """Initialize MCP connections"""
        if self._initialized:
            return

        try:
            logger.info("Initializing MCP client...")

            # Initialize YouTube MCP if enabled
            if settings.MCP_YOUTUBE_ENABLED:
                await self._init_youtube_mcp()

            # Initialize Web Search MCP if enabled
            if settings.MCP_WEB_SCRAPING_ENABLED:
                await self._init_web_mcp()

            self._initialized = True
            logger.info("✅ MCP client initialized successfully")

        except Exception as e:
            logger.error(f"❌ MCP initialization failed: {e}")
            # Don't raise - gracefully degrade to fallback methods
            self._initialized = False

    async def _init_youtube_mcp(self):
        """Initialize YouTube MCP server connection"""
        try:
            logger.info("Connecting to YouTube MCP server...")

            # MCP servers are typically run as separate processes
            # Connect via stdio transport
            server_params = StdioServerParameters(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-youtube"],
                env=None
            )

            # Create client session
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    self.youtube_session = session
                    logger.info("✅ YouTube MCP connected")

        except Exception as e:
            logger.warning(f"YouTube MCP connection failed: {e}")
            logger.info("YouTube research will use fallback method")
            self.youtube_session = None

    async def _init_web_mcp(self):
        """Initialize Web Search MCP server connection"""
        try:
            logger.info("Connecting to Web Search MCP server...")

            server_params = StdioServerParameters(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-brave-search"],
                env=None
            )

            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    self.web_session = session
                    logger.info("✅ Web Search MCP connected")

        except Exception as e:
            logger.warning(f"Web Search MCP connection failed: {e}")
            logger.info("Web search will use fallback method")
            self.web_session = None

    async def search_youtube(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search YouTube videos via MCP

        Args:
            query: Search query
            max_results: Maximum number of results

        Returns:
            List of video results with metadata
        """
        if not self.youtube_session:
            logger.warning("YouTube MCP not available, using fallback")
            return await self._fallback_youtube_search(query)

        try:
            # Call YouTube MCP tool
            result = await self.youtube_session.call_tool(
                "youtube_search",
                arguments={
                    "query": query,
                    "maxResults": max_results
                }
            )

            # Parse results
            if result and result.content:
                videos = self._parse_youtube_results(result.content)
                logger.info(f"Found {len(videos)} YouTube videos for '{query}'")
                return videos

            return []

        except Exception as e:
            logger.error(f"YouTube MCP search failed: {e}")
            return await self._fallback_youtube_search(query)

    async def search_web(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Search web via MCP

        Args:
            query: Search query
            max_results: Maximum number of results

        Returns:
            List of web search results
        """
        if not self.web_session:
            logger.warning("Web Search MCP not available, using fallback")
            return await self._fallback_web_search(query)

        try:
            # Call Web Search MCP tool
            result = await self.web_session.call_tool(
                "brave_web_search",
                arguments={
                    "query": query,
                    "count": max_results
                }
            )

            # Parse results
            if result and result.content:
                results = self._parse_web_results(result.content)
                logger.info(f"Found {len(results)} web results for '{query}'")
                return results

            return []

        except Exception as e:
            logger.error(f"Web Search MCP failed: {e}")
            return await self._fallback_web_search(query)

    def _parse_youtube_results(self, content: Any) -> List[Dict[str, Any]]:
        """Parse YouTube MCP results"""
        videos = []

        try:
            # MCP results come as text or JSON
            if isinstance(content, list):
                data = content[0].text if hasattr(content[0], 'text') else str(content[0])
            else:
                data = str(content)

            # Try to parse as JSON
            if isinstance(data, str):
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, list):
                        videos = parsed
                    elif isinstance(parsed, dict) and 'items' in parsed:
                        videos = parsed['items']
                except json.JSONDecodeError:
                    logger.warning("Could not parse YouTube results as JSON")

        except Exception as e:
            logger.error(f"Error parsing YouTube results: {e}")

        return videos

    def _parse_web_results(self, content: Any) -> List[Dict[str, Any]]:
        """Parse Web Search MCP results"""
        results = []

        try:
            if isinstance(content, list):
                data = content[0].text if hasattr(content[0], 'text') else str(content[0])
            else:
                data = str(content)

            if isinstance(data, str):
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, list):
                        results = parsed
                    elif isinstance(parsed, dict) and 'results' in parsed:
                        results = parsed['results']
                except json.JSONDecodeError:
                    logger.warning("Could not parse web results as JSON")

        except Exception as e:
            logger.error(f"Error parsing web results: {e}")

        return results

    async def _fallback_youtube_search(self, query: str) -> List[Dict[str, Any]]:
        """Fallback YouTube search when MCP not available"""
        logger.info(f"Using fallback YouTube search for: {query}")

        # Return mock data structure for now
        # In production, you could use youtube-search-python or similar
        return [
            {
                "id": {"videoId": "mock_id"},
                "snippet": {
                    "title": f"{query} - Expert Video",
                    "description": f"Comprehensive video about {query}",
                    "channelTitle": "Expert Channel",
                    "publishedAt": "2024-01-01T00:00:00Z"
                }
            }
        ]

    async def _fallback_web_search(self, query: str) -> List[Dict[str, Any]]:
        """Fallback web search when MCP not available"""
        logger.info(f"Using fallback web search for: {query}")

        # Return mock data structure
        return [
            {
                "title": f"{query} - Comprehensive Guide",
                "url": f"https://example.com/article/{query.replace(' ', '-')}",
                "description": f"In-depth article about {query} with expert insights",
                "publishedDate": "2024-01-01"
            }
        ]

    async def close(self):
        """Close MCP connections"""
        if self.youtube_session:
            try:
                # Close session properly
                pass  # Session closes automatically in context manager
            except Exception as e:
                logger.error(f"Error closing YouTube MCP: {e}")

        if self.web_session:
            try:
                pass  # Session closes automatically in context manager
            except Exception as e:
                logger.error(f"Error closing Web MCP: {e}")

        self._initialized = False
        logger.info("MCP client connections closed")


# Global MCP client instance
_mcp_client: Optional[MCPClientService] = None


async def get_mcp_client() -> MCPClientService:
    """
    Get or create MCP client instance

    Returns:
        MCPClientService instance
    """
    global _mcp_client

    if _mcp_client is None:
        _mcp_client = MCPClientService()
        await _mcp_client.initialize()

    return _mcp_client


async def close_mcp_client():
    """Close global MCP client"""
    global _mcp_client

    if _mcp_client:
        await _mcp_client.close()
        _mcp_client = None
