from pathlib import Path

from sqlalchemy import text
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def run_startup_migrations() -> None:
    db_path = settings.DATABASE_URL.removeprefix("sqlite+aiosqlite:///")
    if db_path.startswith("./"):
        db_path = str((Path.cwd() / db_path[2:]).resolve())

    if not db_path.endswith(".db"):
        return

    async with engine.begin() as conn:
        existing_columns = {
            row[1] for row in (await conn.execute(text("PRAGMA table_info(posts)"))).all()
        }
        post_column_statements = {
            "view_count": "ALTER TABLE posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0",
            "unique_view_count": "ALTER TABLE posts ADD COLUMN unique_view_count INTEGER NOT NULL DEFAULT 0",
            "like_count": "ALTER TABLE posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0",
            "comment_count": "ALTER TABLE posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0",
            "share_count": "ALTER TABLE posts ADD COLUMN share_count INTEGER NOT NULL DEFAULT 0",
            "bookmark_count": "ALTER TABLE posts ADD COLUMN bookmark_count INTEGER NOT NULL DEFAULT 0",
        }
        for column, statement in post_column_statements.items():
            if column not in existing_columns:
                await conn.execute(text(statement))

        image_columns = {
            row[1] for row in (await conn.execute(text("PRAGMA table_info(images)"))).all()
        }
        image_column_statements = {
            "original_path": "ALTER TABLE images ADD COLUMN original_path TEXT",
            "blurred_path": "ALTER TABLE images ADD COLUMN blurred_path TEXT",
            "original_filename": "ALTER TABLE images ADD COLUMN original_filename TEXT",
            "mime_type": "ALTER TABLE images ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'image/jpeg'",
            "file_size": "ALTER TABLE images ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0",
            "width": "ALTER TABLE images ADD COLUMN width INTEGER",
            "height": "ALTER TABLE images ADD COLUMN height INTEGER",
        }
        for column, statement in image_column_statements.items():
            if column not in image_columns:
                await conn.execute(text(statement))

        index_statements = [
            "CREATE INDEX IF NOT EXISTS ix_page_views_post_created ON page_views (post_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_page_views_post_ip ON page_views (post_id, ip_hash)",
            "CREATE INDEX IF NOT EXISTS ix_engagements_post_type ON engagements (post_id, type)",
            "CREATE INDEX IF NOT EXISTS ix_engagements_user_type ON engagements (user_id, type)",
            "CREATE INDEX IF NOT EXISTS ix_engagements_post_created ON engagements (post_id, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_posts_view_count ON posts (view_count)",
            "CREATE INDEX IF NOT EXISTS ix_posts_like_count ON posts (like_count)",
        ]
        for statement in index_statements:
            await conn.execute(text(statement))


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
