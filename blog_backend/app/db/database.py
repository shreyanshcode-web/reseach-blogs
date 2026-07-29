import json
import logging
from pathlib import Path
import time

from sqlalchemy import text
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("app.database")


def safe_json_deserializer(value: str):
    if not value or not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


def _sqlite_db_path(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite+aiosqlite:///"):
        return None
    db_path = database_url.removeprefix("sqlite+aiosqlite:///")
    if db_path.startswith("./"):
        return (Path.cwd() / db_path[2:]).resolve()
    return Path(db_path).expanduser().resolve()


db_file = _sqlite_db_path(settings.DATABASE_URL)
if db_file is not None:
    db_file.parent.mkdir(parents=True, exist_ok=True)


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    json_deserializer=safe_json_deserializer,
    pool_pre_ping=True,
)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


@event.listens_for(engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, _cursor, _statement, _parameters, _context, _executemany):
    conn.info.setdefault("query_start_time", []).append(time.perf_counter())


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, _cursor, statement, _parameters, _context, _executemany):
    start = conn.info.get("query_start_time", []).pop(-1)
    duration = time.perf_counter() - start
    if duration >= 0.25:
        logger.warning("Slow database query %.3fs: %s", duration, statement.splitlines()[0][:180])

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def run_startup_migrations() -> None:
    db_path = _sqlite_db_path(settings.DATABASE_URL)
    if db_path is None or db_path.suffix != ".db":
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
            "slug": "ALTER TABLE posts ADD COLUMN slug VARCHAR(240)",
            "tags": "ALTER TABLE posts ADD COLUMN tags JSON",
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
            "CREATE INDEX IF NOT EXISTS ix_posts_title ON posts (title)",
            "CREATE INDEX IF NOT EXISTS ix_posts_slug ON posts (slug)",
            "CREATE INDEX IF NOT EXISTS ix_posts_created_at ON posts (created_at)",
            "CREATE INDEX IF NOT EXISTS ix_posts_author_id ON posts (author_id)",
            "CREATE INDEX IF NOT EXISTS ix_posts_tags ON posts (tags)",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_slug ON posts (slug)",
            "CREATE TABLE IF NOT EXISTS follows (id INTEGER PRIMARY KEY, follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_follows_pair UNIQUE (follower_id, followed_id))",
            "CREATE INDEX IF NOT EXISTS ix_follows_follower ON follows (follower_id)",
            "CREATE INDEX IF NOT EXISTS ix_follows_followed ON follows (followed_id)",
        ]
        rows = (await conn.execute(text("SELECT id, title FROM posts WHERE slug IS NULL OR slug = ''"))).all()
        used_slugs = {
            row[0] for row in (await conn.execute(text("SELECT slug FROM posts WHERE slug IS NOT NULL AND slug != ''"))).all()
        }
        for post_id, title in rows:
            import re
            base = re.sub(r"[^a-z0-9]+", "-", (title or "post").strip().lower()).strip("-") or "post"
            base = base[:200]
            slug = base
            suffix = 2
            while slug in used_slugs:
                slug = f"{base}-{suffix}"
                suffix += 1
            used_slugs.add(slug)
            await conn.execute(text("UPDATE posts SET slug = :slug WHERE id = :id"), {"slug": slug, "id": post_id})
        for statement in index_statements:
            await conn.execute(text(statement))


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            logger.exception("Database transaction failed; rolling back")
            await session.rollback()
            raise
