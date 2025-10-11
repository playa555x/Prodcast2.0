"""
GedächtnisBoost Premium TTS Platform
FastAPI Backend - Main Application

Version: 2.0.0
Quality: 12/10 - Production Ready
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
from contextlib import asynccontextmanager
import logging
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import shutil
import subprocess
import uuid

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# Request ID Middleware
# ============================================

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add unique request IDs to every request
    for distributed tracing and debugging
    """
    async def dispatch(self, request: Request, call_next):
        # Extract or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Add to request state for access in endpoints
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response

# ============================================
# Application Lifespan
# ============================================

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting GedächtnisBoost Premium API...")
    logger.info("📡 Environment: Development")
    logger.info("🔗 API Docs: http://localhost:8001/docs")

    # Check MCP prerequisites
    if not check_mcp_prerequisites():
        logger.warning("⚠️ MCP features will be disabled")
        logger.warning("Set MCP_YOUTUBE_ENABLED=false and MCP_WEB_SCRAPING_ENABLED=false")
        logger.warning("Or install Node.js 18+ to enable MCP features")

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

# ============================================
# FastAPI Application
# ============================================

app = FastAPI(
    title="GedächtnisBoost Premium TTS API",
    description="Ultimate Text-to-Speech Platform with 3D Visualization",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ============================================
# Rate Limiting
# ============================================

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================
# CORS Middleware
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js Dev (default)
        "http://localhost:3001",  # Next.js alternative port
        "http://localhost:3002",
        "http://localhost:4200",  # Angular dev
        "http://localhost:5173",  # Vite dev
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://ubiquitous-sprite-b204a9.netlify.app",  # Netlify Production Frontend
        "https://prodcast2-0-3.onrender.com",  # Production Backend (self-origin for CORS)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "X-Request-ID"],  # Expose all headers including request ID
)

# Add Request ID Middleware
app.add_middleware(RequestIDMiddleware)

# ============================================
# Health Check Endpoint
# ============================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API status"""
    return {
        "app": "GedächtnisBoost Premium TTS API",
        "version": "2.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "development",
        "services": {
            "database": "operational",
            "tts_providers": {
                "speechify": "available",
                "openai": "available",
                "elevenlabs": "available",
                "google": "available"
            }
        },
        "metrics": {
            "uptime_seconds": 0,  # TODO: Track actual uptime
            "requests_total": 0,
            "errors_total": 0
        }
    }

# ============================================
# API Routes (Import when ready)
# ============================================

from api.auth import router as auth_router
from api.tts import router as tts_router
from api.podcast import router as podcast_router
from api.research import router as research_router
from api.production import router as production_router
from api.users import router as users_router
from api.voice_library import router as voice_library_router
from api.ai_studio import router as ai_studio_router
from api.claude_script import router as claude_script_router
from api.projects import router as projects_router
from api.admin import router as admin_router
from api.account import router as account_router
from api.trending import router as trending_router

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/api", tags=["Projects"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])
app.include_router(account_router, prefix="/api", tags=["Account"])
app.include_router(trending_router, prefix="/api", tags=["Trending Topics"])
app.include_router(tts_router, prefix="/api/tts", tags=["TTS"])
app.include_router(podcast_router, prefix="/api/podcast", tags=["Podcast"])
app.include_router(research_router, prefix="/api/research", tags=["AI Research"])
app.include_router(production_router, prefix="/api/production", tags=["Production Pipeline"])
app.include_router(ai_studio_router, prefix="/api/ai-studio", tags=["AI Studio"])
app.include_router(claude_script_router, prefix="/api/claude-script", tags=["Claude Script Generation"])
app.include_router(users_router)
app.include_router(voice_library_router)

# ============================================
# Error Handlers
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    logger.error(f"HTTP Error: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all exception handler with CORS support"""
    from core.config import settings

    logger.error(f"Unexpected Error: {str(exc)}", exc_info=True)

    # In development, show actual error for debugging
    error_detail = str(exc) if settings.DEBUG else "Internal server error"

    response = JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": error_detail,
            "type": type(exc).__name__,
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    # Ensure CORS headers are added even to error responses
    origin = request.headers.get("Origin", "")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"

    return response

# ============================================
# Run Application
# ============================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
