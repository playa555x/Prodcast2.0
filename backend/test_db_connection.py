"""
Test Neon PostgreSQL Database Connection
Verifies connection and queries admin user
"""

import sys
import logging
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        from core.database import SessionLocal, check_db_connection
        from models.user import User
        from core.config import settings

        logger.info(f"Testing connection to: {settings.db_url[:50]}...")

        # Test 1: Basic connection
        if not check_db_connection():
            logger.error("❌ Database connection test failed")
            sys.exit(1)

        logger.info("✅ Database connection successful!")

        # Test 2: Query admin user
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.username == "admin").first()

            if admin:
                logger.info(f"✅ Admin user found:")
                logger.info(f"   - Username: {admin.username}")
                logger.info(f"   - Email: {admin.email}")
                logger.info(f"   - Role: {admin.role}")
                logger.info(f"   - Status: {admin.status}")
                logger.info(f"   - Created: {admin.created_at}")
            else:
                logger.error("❌ Admin user not found")
                sys.exit(1)

            # Test 3: Count all users
            user_count = db.query(User).count()
            logger.info(f"✅ Total users in database: {user_count}")

            # Test 4: Check table structure
            result = db.execute(text("""
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))

            logger.info("✅ Users table structure:")
            for row in result:
                logger.info(f"   - {row.column_name}: {row.data_type}")

        finally:
            db.close()

        logger.info("\n✅ All database tests passed!")
        logger.info("\nDatabase is ready for production use!")

    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
