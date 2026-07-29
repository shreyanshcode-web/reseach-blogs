"""
Separate database engine for ML training data.
Keeps training data isolated from the main application database.
"""
import logging
from pathlib import Path
import time

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("app.ml_database")

# Separate SQLite database for ML training data
ML_DATABASE_URL = getattr(settings, "ML_DATABASE_URL", "sqlite+aiosqlite:///./ml_training.db")

if ML_DATABASE_URL.startswith("sqlite+aiosqlite:///"):
    ml_db_path = ML_DATABASE_URL.removeprefix("sqlite+aiosqlite:///")
    if ml_db_path.startswith("./"):
        ml_db_path = str((Path.cwd() / ml_db_path[2:]).resolve())
    Path(ml_db_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

ml_engine = create_async_engine(ML_DATABASE_URL, echo=False, pool_pre_ping=True)
ml_async_session = async_sessionmaker(ml_engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(ml_engine.sync_engine, "connect")
def set_ml_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


@event.listens_for(ml_engine.sync_engine, "before_cursor_execute")
def before_ml_cursor_execute(conn, _cursor, _statement, _parameters, _context, _executemany):
    conn.info.setdefault("query_start_time", []).append(time.perf_counter())


@event.listens_for(ml_engine.sync_engine, "after_cursor_execute")
def after_ml_cursor_execute(conn, _cursor, statement, _parameters, _context, _executemany):
    start = conn.info.get("query_start_time", []).pop(-1)
    duration = time.perf_counter() - start
    if duration >= 0.25:
        logger.warning("Slow ML database query %.3fs: %s", duration, statement.splitlines()[0][:180])


class MLBase(DeclarativeBase):
    """Separate declarative base for all ML training tables."""
    pass


async def get_ml_db():
    """Dependency for ML training database sessions."""
    async with ml_async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            logger.exception("ML database transaction failed; rolling back")
            await session.rollback()
            raise


async def init_ml_db():
    """Create all ML training tables."""
    async with ml_engine.begin() as conn:
        await conn.run_sync(MLBase.metadata.create_all)


async def dispose_ml_db():
    """Cleanup ML engine on shutdown."""
    await ml_engine.dispose()
