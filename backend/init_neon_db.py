"""
Initialize Neon PostgreSQL Database
Creates all tables and default admin user
"""

import sys
import logging
from sqlalchemy.orm import Session

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """
    Initialize Neon database:
    1. Create all tables
    2. Create default admin user
    3. Verify connection
    """
    try:
        # Import database modules
        from core.database import engine, SessionLocal, init_db, create_default_admin, check_db_connection
        from core.config import settings

        logger.info(f"Initializing database: {settings.db_url[:50]}...")

        # Check connection first
        logger.info("Testing database connection...")
        if not check_db_connection():
            logger.error("Failed to connect to database")
            sys.exit(1)

        logger.info("Database connection successful!")

        # Create tables
        logger.info("Creating database tables...")
        init_db()
        logger.info("Tables created successfully!")

        # Create admin user
        logger.info("Creating default admin user...")
        db = SessionLocal()
        try:
            create_default_admin(db)
            logger.info("Admin user setup complete!")
        finally:
            db.close()

        # Verify tables
        logger.info("Verifying database setup...")
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        logger.info(f"Created {len(tables)} tables:")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            logger.info(f"  - {table} ({len(columns)} columns)")

        logger.info("\n✅ Database initialization completed successfully!")
        logger.info("\nNext steps:")
        logger.info("1. Start backend: cd backend && python -m uvicorn main:app --reload --port 8001")
        logger.info("2. Test health: curl http://localhost:8001/health")
        logger.info("3. Login as admin: username=admin, password=ChangeMeNow123!")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
