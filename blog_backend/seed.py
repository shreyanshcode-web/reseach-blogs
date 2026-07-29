"""Seed local SQLite databases with an admin user and sample content."""
import asyncio
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent))

from app.core.security import hash_password
from app.db.database import Base, async_session, engine, run_startup_migrations
from app.db.ml_database import init_ml_db, ml_async_session
from app.ml.models.ml_training_models import TrainingKeyword, TrainingSample
from app.models.user import User
from app.schemas.post_schema import PostCreate
from app.services.post_service import post_service
from app.repositories.user_repository import user_repository

# Import models so Base metadata is complete.
import app.models.analytics  # noqa: F401
import app.models.follow  # noqa: F401
import app.models.image  # noqa: F401
import app.models.moderation_log  # noqa: F401
import app.models.post  # noqa: F401
import app.models.user_profile  # noqa: F401
import app.models.weekly_top  # noqa: F401


async def seed_main_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await run_startup_migrations()

    async with async_session() as db:
        admin = await user_repository.get_by_email(db, "admin@example.com")
        if admin is None:
            admin = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hash_password("admin12345"),
                is_admin=True,
                is_verified=True,
            )
            db.add(admin)
            await db.flush()

        samples = [
            ("Welcome to The Making.Of", ["platform", "welcome"]),
            ("How Ideas Become Movements", ["research", "culture"]),
            ("Notes From the Machine Age", ["technology", "essay"]),
        ]
        for title, tags in samples:
            await post_service.create_post(
                db,
                PostCreate(
                    title=title,
                    content=f"{title} — a sample editorial post for local development.",
                    tags=tags,
                    published=True,
                ),
                author_id=admin.id,
            )
        await db.commit()


async def seed_ml_db() -> None:
    await init_ml_db()
    async with ml_async_session() as db:
        db.add_all([
            TrainingSample(text="A thoughtful essay about design systems.", label="appropriate", source="seed", is_validated=True),
            TrainingKeyword(keyword="spam", category="spam", severity="medium", suggestion="Remove promotional spam."),
        ])
        await db.commit()


async def main() -> None:
    await seed_main_db()
    await seed_ml_db()
    print("Seed complete: admin@example.com / admin12345")


if __name__ == "__main__":
    asyncio.run(main())
