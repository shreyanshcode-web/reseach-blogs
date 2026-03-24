"""
Separate database engine for ML training data.
Keeps training data isolated from the main application database.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Separate SQLite database for ML training data
ML_DATABASE_URL = getattr(settings, "ML_DATABASE_URL", "sqlite+aiosqlite:///./ml_training.db")

ml_engine = create_async_engine(ML_DATABASE_URL, echo=False)
ml_async_session = async_sessionmaker(ml_engine, class_=AsyncSession, expire_on_commit=False)


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
            await session.rollback()
            raise


async def init_ml_db():
    """Create all ML training tables."""
    async with ml_engine.begin() as conn:
        await conn.run_sync(MLBase.metadata.create_all)


async def dispose_ml_db():
    """Cleanup ML engine on shutdown."""
    await ml_engine.dispose()
