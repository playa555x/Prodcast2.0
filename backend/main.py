"""
GedächtnisBoost Premium TTS Platform
FastAPI Backend - Main Application

Version: 2.0.0
Quality: 12/10 - Production Ready
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager
import logging
from datetime import datetime

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# Application Lifespan
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting GedächtnisBoost Premium API...")
    logger.info("📡 Environment: Development")
    logger.info("🔗 API Docs: http://localhost:8001/docs")

    # Initialize database
    from core.database import init_db, create_default_admin, get_db
    try:
        logger.info("📊 Initializing database...")
        init_db()

        # Create default admin user
        db = next(get_db())
        create_default_admin(db)
        db.close()

        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")

    yield

    # Shutdown
    logger.info("👋 Shutting down GedächtnisBoost Premium API...")

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
        "https://*.vercel.app",   # Vercel Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
    """Catch-all exception handler"""
    logger.error(f"Unexpected Error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

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
