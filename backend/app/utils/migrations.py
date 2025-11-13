"""Database migration utilities"""
from pathlib import Path
import os
import psycopg2
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

def run_migration_sync(sql_file_path: str) -> dict:
    """
    Execute SQL migration file using psycopg2 (sync).
    This is simpler for running multi-statement SQL files.

    Args:
        sql_file_path: Path to SQL file

    Returns:
        Dict with status and details
    """
    try:
        # Read SQL file
        sql_content = Path(sql_file_path).read_text()

        # Parse DATABASE_URL from environment
        db_url = os.environ.get('DATABASE_URL', '')
        # Convert SQLAlchemy URL to psycopg2 format
        # postgresql+asyncpg://user:pass@host:port/db -> postgresql://user:pass@host:port/db
        if 'postgresql+asyncpg://' in db_url:
            db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')

        # Connect using psycopg2
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        # Execute the entire SQL file
        cursor.execute(sql_content)
        conn.commit()

        # Verify tables created
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return {
            "status": "success",
            "message": f"Migration completed successfully. Created {len(tables)} tables.",
            "tables": tables
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Migration failed: {str(e)}"
        }


async def run_sql_migration(session: AsyncSession, sql_file_path: str) -> dict:
    """
    Wrapper to call sync migration from async context.
    """
    # Call the sync version
    return run_migration_sync(sql_file_path)


async def get_database_status(session: AsyncSession) -> dict:
    """Get current database status"""
    try:
        # Check tables
        result = await session.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """))

        tables = [row[0] for row in result.fetchall()]

        # Check extensions
        ext_result = await session.execute(text("""
            SELECT extname FROM pg_extension
            WHERE extname IN ('uuid-ossp', 'citext')
            ORDER BY extname;
        """))

        extensions = [row[0] for row in ext_result.fetchall()]

        return {
            "status": "ok",
            "tables_count": len(tables),
            "tables": tables,
            "extensions": extensions,
            "initialized": len(tables) > 0
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "initialized": False
        }
