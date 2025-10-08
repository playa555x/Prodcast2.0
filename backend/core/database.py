"""
Database Connection & Session Management
Production-Ready SQLAlchemy Setup
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
import logging

from core.config import settings

logger = logging.getLogger(__name__)

# ============================================
# Database Engine
# ============================================

# SQLite for development (with special settings for concurrency)
if settings.db_url.startswith("sqlite"):
    engine = create_engine(
        settings.db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=settings.DEBUG
    )
    logger.info("Using SQLite database for development")
else:
    # PostgreSQL/Neon for production
    engine = create_engine(
        settings.db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=settings.DEBUG
    )
    logger.info("Using PostgreSQL database for production")

# ============================================
# Session Factory
# ============================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ============================================
# Database Dependency
# ============================================

def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# Database Initialization
# ============================================

def init_db() -> None:
    """
    Initialize database tables
    Creates all tables defined in models
    """
    from models.user import Base as UserBase
    from models.audio import Base as AudioBase
    from models.podcast import Base as PodcastBase
    
    logger.info("Creating database tables...")
    
    # Create all tables
    UserBase.metadata.create_all(bind=engine)
    AudioBase.metadata.create_all(bind=engine)
    PodcastBase.metadata.create_all(bind=engine)
    
    logger.info("Database tables created successfully")

def create_default_admin(db: Session) -> None:
    """
    Create default admin user if not exists
    Username: admin
    Password: Set via ADMIN_DEFAULT_PASSWORD env var
    """
    from models.user import User, UserRole, UserStatus
    from core.security import get_password_hash
    import os
    
    # Check if admin exists
    admin = db.query(User).filter(User.username == "admin").first()
    
    if not admin:
        default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "Mallman12")

        admin = User(
            username="admin",
            email="admin@gedaechtnisboost.de",
            password_hash=get_password_hash(default_password),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        db.add(admin)
        db.commit()
        
        logger.warning(f"Created default admin user with password: {default_password}")
        logger.warning("CHANGE THIS PASSWORD IMMEDIATELY!")
    else:
        logger.info("Admin user already exists")

# ============================================
# Database Health Check
# ============================================

def check_db_connection() -> bool:
    """
    Check if database connection is working
    Returns True if successful, False otherwise
    """
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
