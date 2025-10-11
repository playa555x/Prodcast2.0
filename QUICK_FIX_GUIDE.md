# Quick Fix Guide - Critical MCP Issues

## STOP - READ THIS FIRST

Your MCP integration is **BROKEN** and will not work in production. This guide provides immediate fixes for the critical issues.

---

## Issue #1: CRITICAL - Broken MCP Session Management

### The Problem
**File:** `backend/services/mcp_client.py` lines 69-73, 91-95

Sessions are stored but immediately closed by context managers. This is the #1 critical bug.

### The Fix

Replace both `_init_youtube_mcp()` and `_init_web_mcp()` with this pattern:

```python
async def _init_youtube_mcp(self):
    """Initialize YouTube MCP server connection"""
    try:
        logger.info("Connecting to YouTube MCP server...")

        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-youtube"],
            env=None
        )

        # Create client session (don't use async with here!)
        # We'll manage the lifecycle manually
        self.youtube_stdio = stdio_client(server_params)
        self.youtube_read, self.youtube_write = await self.youtube_stdio.__aenter__()

        self.youtube_session = ClientSession(self.youtube_read, self.youtube_write)
        await self.youtube_session.__aenter__()
        await self.youtube_session.initialize()

        logger.info("✅ YouTube MCP connected")

    except Exception as e:
        logger.warning(f"YouTube MCP connection failed: {e}")
        logger.info("YouTube research will use fallback method")
        self.youtube_session = None
        self.youtube_stdio = None


async def _init_web_mcp(self):
    """Initialize Web Search MCP server connection"""
    try:
        logger.info("Connecting to Web Search MCP server...")

        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-brave-search"],
            env=None
        )

        self.web_stdio = stdio_client(server_params)
        self.web_read, self.web_write = await self.web_stdio.__aenter__()

        self.web_session = ClientSession(self.web_read, self.web_write)
        await self.web_session.__aenter__()
        await self.web_session.initialize()

        logger.info("✅ Web Search MCP connected")

    except Exception as e:
        logger.warning(f"Web Search MCP connection failed: {e}")
        logger.info("Web search will use fallback method")
        self.web_session = None
        self.web_stdio = None


async def close(self):
    """Close MCP connections"""
    if self.youtube_session:
        try:
            await self.youtube_session.__aexit__(None, None, None)
            await self.youtube_stdio.__aexit__(None, None, None)
            logger.info("Closed YouTube MCP session")
        except Exception as e:
            logger.error(f"Error closing YouTube MCP: {e}")
        finally:
            self.youtube_session = None
            self.youtube_stdio = None

    if self.web_session:
        try:
            await self.web_session.__aexit__(None, None, None)
            await self.web_stdio.__aexit__(None, None, None)
            logger.info("Closed Web MCP session")
        except Exception as e:
            logger.error(f"Error closing Web MCP: {e}")
        finally:
            self.web_session = None
            self.web_stdio = None

    self._initialized = False
    logger.info("MCP client connections closed")
```

**Update `__init__` to track stdio connections:**
```python
def __init__(self):
    """Initialize MCP client"""
    self.youtube_session: Optional[ClientSession] = None
    self.web_session: Optional[ClientSession] = None
    self.youtube_stdio = None
    self.web_stdio = None
    self.youtube_read = None
    self.youtube_write = None
    self.web_read = None
    self.web_write = None
    self._initialized = False
```

---

## Issue #2: Add MCP Availability Checks

### The Problem
Services use MCP without checking if it's actually available.

### The Fix

**File:** `backend/services/research_service.py`

Update `_research_youtube()` method (around line 139):

```python
async def _research_youtube(self, topic: str) -> List[ResearchSource]:
    """Research YouTube videos via MCP"""
    logger.info(f"YouTube research for: {topic}")

    sources = []

    # Check if MCP is enabled in config
    if not settings.MCP_YOUTUBE_ENABLED:
        logger.warning("YouTube MCP disabled in configuration")
        return sources

    try:
        # Get MCP client
        mcp = await get_mcp_client()

        # Check if client is actually initialized and has session
        if not mcp._initialized:
            logger.warning("MCP client not initialized")
            return sources

        if not mcp.youtube_session:
            logger.warning("YouTube MCP session not available")
            return sources

        # Search YouTube via MCP
        videos = await mcp.search_youtube(
            query=topic,
            max_results=3
        )

        # Convert to ResearchSource objects
        for video in videos:
            snippet = video.get("snippet", {})
            video_id = video.get("id", {}).get("videoId", "")

            source = ResearchSource(
                source_type="youtube",
                title=snippet.get("title", f"{topic} Video"),
                url=f"https://youtube.com/watch?v={video_id}" if video_id else None,
                summary=snippet.get("description", f"Video about {topic}")[:200],
                key_insights=[
                    snippet.get("title", ""),
                    f"Channel: {snippet.get('channelTitle', 'Unknown')}",
                    f"Published: {snippet.get('publishedAt', 'Unknown')}"
                ],
                credibility_score=0.8
            )
            sources.append(source)

        logger.info(f"✅ Found {len(sources)} YouTube videos via MCP")

    except Exception as e:
        logger.error(f"YouTube MCP research failed: {e}", exc_info=True)
        # Return empty list on error

    return sources
```

**Update `_research_web()` similarly (around line 204):**

```python
async def _research_web(self, topic: str, scientific: bool, everyday: bool) -> List[ResearchSource]:
    """Research web sources via MCP"""
    logger.info(f"Web research for: {topic} (scientific={scientific}, everyday={everyday})")

    sources = []

    # Check if MCP is enabled
    if not settings.MCP_WEB_SCRAPING_ENABLED:
        logger.warning("Web scraping MCP disabled in configuration")
        return sources

    try:
        # Get MCP client
        mcp = await get_mcp_client()

        # Check availability
        if not mcp._initialized or not mcp.web_session:
            logger.warning("Web MCP session not available")
            return sources

        # Build search queries
        queries = []
        if scientific:
            queries.append(f"{topic} research study scientific")
        if everyday:
            queries.append(f"{topic} practical everyday use")

        # Search web via MCP for each query
        for query in queries:
            try:
                results = await mcp.search_web(
                    query=query,
                    max_results=5
                )

                # Convert to ResearchSource objects
                for result in results[:3]:  # Take top 3 per query
                    source_type = "scientific" if "research" in query or "scientific" in query else "web"

                    source = ResearchSource(
                        source_type=source_type,
                        title=result.get("title", f"{topic} Article"),
                        url=result.get("url", None),
                        summary=result.get("description", f"Article about {topic}")[:300],
                        key_insights=[
                            result.get("title", "")[:100],
                            f"Published: {result.get('publishedDate', 'Unknown')}",
                            "Source: Web Search via MCP"
                        ],
                        credibility_score=0.85 if source_type == "scientific" else 0.7
                    )
                    sources.append(source)

                logger.info(f"✅ Found {len(results)} web results for '{query}' via MCP")

            except Exception as e:
                logger.error(f"Web search failed for '{query}': {e}", exc_info=True)
                continue

    except Exception as e:
        logger.error(f"Web MCP research failed: {e}", exc_info=True)

    return sources
```

---

## Issue #3: Remove Mock Data Fallbacks

### The Problem
Fallback methods return fake data that looks real.

### The Fix

**File:** `backend/services/mcp_client.py`

Replace lines 228-258:

```python
async def _fallback_youtube_search(self, query: str) -> List[Dict[str, Any]]:
    """Fallback YouTube search when MCP not available"""
    logger.warning(f"YouTube search not available for: {query}")
    logger.warning("Configure MCP_YOUTUBE_ENABLED and ensure npx is installed")
    # Return empty list - no mock data
    return []


async def _fallback_web_search(self, query: str) -> List[Dict[str, Any]]:
    """Fallback web search when MCP not available"""
    logger.warning(f"Web search not available for: {query}")
    logger.warning("Configure MCP_WEB_SCRAPING_ENABLED and ensure npx is installed")
    # Return empty list - no mock data
    return []
```

---

## Issue #4: Add Timeouts

### The Problem
MCP calls can hang forever.

### The Fix

**File:** `backend/services/mcp_client.py`

Add timeouts to all MCP calls:

```python
import asyncio

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
        # Call YouTube MCP tool with timeout
        result = await asyncio.wait_for(
            self.youtube_session.call_tool(
                "youtube_search",
                arguments={
                    "query": query,
                    "maxResults": max_results
                }
            ),
            timeout=30.0  # 30 second timeout
        )

        # Parse results
        if result and result.content:
            videos = self._parse_youtube_results(result.content)
            logger.info(f"Found {len(videos)} YouTube videos for '{query}'")
            return videos

        return []

    except asyncio.TimeoutError:
        logger.error(f"YouTube MCP search timed out after 30s for: {query}")
        return await self._fallback_youtube_search(query)
    except Exception as e:
        logger.error(f"YouTube MCP search failed: {e}", exc_info=True)
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
        # Call Web Search MCP tool with timeout
        result = await asyncio.wait_for(
            self.web_session.call_tool(
                "brave_web_search",
                arguments={
                    "query": query,
                    "count": max_results
                }
            ),
            timeout=30.0  # 30 second timeout
        )

        # Parse results
        if result and result.content:
            results = self._parse_web_results(result.content)
            logger.info(f"Found {len(results)} web results for '{query}'")
            return results

        return []

    except asyncio.TimeoutError:
        logger.error(f"Web Search MCP timed out after 30s for: {query}")
        return await self._fallback_web_search(query)
    except Exception as e:
        logger.error(f"Web Search MCP failed: {e}", exc_info=True)
        return await self._fallback_web_search(query)
```

---

## Issue #5: Fix Race Condition

### The Problem
Multiple requests can initialize MCP client simultaneously.

### The Fix

**File:** `backend/services/mcp_client.py`

Update the global getter:

```python
import asyncio

# Global MCP client instance
_mcp_client: Optional[MCPClientService] = None
_mcp_client_lock = asyncio.Lock()  # Add lock


async def get_mcp_client() -> MCPClientService:
    """
    Get or create MCP client instance (thread-safe)

    Returns:
        MCPClientService instance
    """
    global _mcp_client

    if _mcp_client is None:
        async with _mcp_client_lock:  # Thread-safe initialization
            # Double-check after acquiring lock
            if _mcp_client is None:
                _mcp_client = MCPClientService()
                await _mcp_client.initialize()

    return _mcp_client
```

---

## Issue #6: Add Cleanup on Shutdown

### The Problem
MCP resources not cleaned up when application stops.

### The Fix

**File:** `backend/main.py`

Update the lifespan function (around line 31):

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting GedächtnisBoost Premium API...")
    logger.info("📡 Environment: Development")
    logger.info("🔗 API Docs: http://localhost:8001/docs")

    # Initialize database
    from core.database import init_db, create_default_admin, get_db, check_db_connection
    try:
        logger.info("📊 Initializing database...")

        # Check connection first
        if not check_db_connection():
            raise Exception("Cannot connect to database. Check DATABASE_URL in .env")

        logger.info("✅ Database connection verified")

        init_db()

        # Create default admin user
        db = next(get_db())
        create_default_admin(db)
        db.close()

        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        logger.error("Server will not start. Fix database connection and try again.")
        raise  # Stop server startup

    # Initialize MCP if enabled
    from core.config import settings
    if settings.MCP_YOUTUBE_ENABLED or settings.MCP_WEB_SCRAPING_ENABLED:
        logger.info("🔌 MCP enabled - initializing client...")
        try:
            from services.mcp_client import get_mcp_client
            await get_mcp_client()
            logger.info("✅ MCP client initialized")
        except Exception as e:
            logger.warning(f"⚠️ MCP initialization failed: {e}")
            logger.warning("MCP features will use fallback methods")

    yield

    # Shutdown
    logger.info("👋 Shutting down GedächtnisBoost Premium API...")

    # Close MCP client
    if settings.MCP_YOUTUBE_ENABLED or settings.MCP_WEB_SCRAPING_ENABLED:
        logger.info("Closing MCP connections...")
        try:
            from services.mcp_client import close_mcp_client
            await close_mcp_client()
            logger.info("✅ MCP connections closed")
        except Exception as e:
            logger.error(f"Error closing MCP: {e}")
```

---

## Issue #7: Add Prerequisites Check

### The Problem
No verification that Node.js/npx is installed.

### The Fix

**File:** `backend/main.py`

Add this function before the lifespan function:

```python
import shutil

def check_mcp_prerequisites() -> bool:
    """Check if MCP prerequisites are available"""
    from core.config import settings

    if not (settings.MCP_YOUTUBE_ENABLED or settings.MCP_WEB_SCRAPING_ENABLED):
        return True  # MCP not needed

    # Check for npx
    if not shutil.which("npx"):
        logger.error("❌ MCP enabled but 'npx' command not found")
        logger.error("Please install Node.js 18+ from: https://nodejs.org/")
        logger.error("After installation, restart the server")
        return False

    # Check Node.js version
    try:
        import subprocess
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        version = result.stdout.strip()
        logger.info(f"✅ Node.js version: {version}")

        # Check if version is at least 18
        major_version = int(version.lstrip('v').split('.')[0])
        if major_version < 18:
            logger.warning(f"⚠️ Node.js {major_version} detected. MCP requires Node.js 18+")
            logger.warning("Please upgrade Node.js from: https://nodejs.org/")
            return False

    except Exception as e:
        logger.warning(f"Could not verify Node.js version: {e}")

    logger.info("✅ MCP prerequisites available")
    return True
```

**Then call it in lifespan:**

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting GedächtnisBoost Premium API...")

    # Check MCP prerequisites
    if not check_mcp_prerequisites():
        logger.warning("⚠️ MCP features will be disabled")
        logger.warning("Set MCP_YOUTUBE_ENABLED=false and MCP_WEB_SCRAPING_ENABLED=false")
        logger.warning("Or install Node.js 18+ to enable MCP features")

    # ... rest of startup code
```

---

## Testing Your Fixes

After applying these fixes, test with:

```bash
# 1. Test without MCP (should work)
MCP_YOUTUBE_ENABLED=false MCP_WEB_SCRAPING_ENABLED=false python backend/main.py

# 2. Test with MCP but no Node.js (should warn gracefully)
MCP_YOUTUBE_ENABLED=true python backend/main.py

# 3. Test with MCP enabled (requires Node.js 18+)
# Install Node.js first: https://nodejs.org/
MCP_YOUTUBE_ENABLED=true MCP_WEB_SCRAPING_ENABLED=true python backend/main.py

# 4. Test research endpoint
curl -X POST http://localhost:8001/api/research/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "artificial intelligence", "target_duration_minutes": 30}'
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Application starts without errors
- [ ] MCP prerequisites check runs on startup
- [ ] Warning shown if Node.js not installed
- [ ] Research jobs complete successfully (with or without MCP)
- [ ] No "session closed" errors in logs
- [ ] Application shuts down cleanly (no hanging processes)
- [ ] MCP sessions properly cleaned up
- [ ] Fallbacks work when MCP unavailable
- [ ] No mock data returned (empty lists instead)

---

## Production Deployment

**Before deploying:**

1. Apply all fixes above
2. Run tests: `pytest backend/tests/`
3. Test with MCP disabled: `MCP_YOUTUBE_ENABLED=false`
4. Test with MCP enabled (if Node.js available)
5. Monitor logs for any "session closed" errors
6. Set up health checks to monitor MCP status

**Environment variables for production:**

```env
# Disable MCP initially (safest)
MCP_YOUTUBE_ENABLED=false
MCP_WEB_SCRAPING_ENABLED=false

# Or enable if Node.js 18+ installed
MCP_YOUTUBE_ENABLED=true
MCP_WEB_SCRAPING_ENABLED=true
```

---

## Need Help?

Refer to the full QA report: `QA_REPORT_COMPREHENSIVE.md`

MCP Documentation: https://docs.claude.com/en/docs/claude-code/mcp
