import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.database import Base
from app.db.ml_database import MLBase
from app.ml.models.ml_training_models import TrainingSample
from app.models.user import User
from app.models.post import Post
from app.schemas.post_schema import PostCreate, PostUpdate
from app.services.post_service import post_service
from app.repositories.post_repository import post_repository

import app.models.analytics  # noqa: F401
import app.models.follow  # noqa: F401
import app.models.image  # noqa: F401
import app.models.moderation_log  # noqa: F401
import app.models.user_profile  # noqa: F401
import app.models.weekly_top  # noqa: F401


@pytest.fixture()
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


@pytest.fixture()
async def ml_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(MLBase.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


async def create_user(session):
    user = User(username="writer", email="writer@example.com", hashed_password="hashed")
    session.add(user)
    await session.flush()
    return user


@pytest.mark.anyio
async def test_create_post_generates_unique_slug(db_session):
    user = await create_user(db_session)
    first = await post_service.create_post(db_session, PostCreate(title="My First Post", content="hello", published=True), user.id)
    second = await post_service.create_post(db_session, PostCreate(title="My First Post", content="hello", published=True), user.id)
    assert first.slug == "my-first-post"
    assert second.slug == "my-first-post-2"


@pytest.mark.anyio
async def test_update_post_refreshes_slug(db_session):
    user = await create_user(db_session)
    post = await post_service.create_post(db_session, PostCreate(title="Old Title", content="hello", published=True), user.id)
    updated = await post_service.update_post(db_session, post.id, PostUpdate(title="New Title"), user.id)
    assert updated.slug == "new-title"


@pytest.mark.anyio
async def test_pagination_search_and_sort(db_session):
    user = await create_user(db_session)
    for title, views in [("AI Notes", 3), ("Culture Letter", 9), ("Design AI", 1)]:
        post = await post_service.create_post(db_session, PostCreate(title=title, content="body", tags=["AI"], published=True), user.id)
        post.view_count = views
    results = await post_service.search_posts(db_session, "AI", skip=0, limit=1, sort="most_viewed")
    assert len(results) == 1
    assert results[0].title == "AI Notes"


@pytest.mark.anyio
async def test_delete_post(db_session):
    user = await create_user(db_session)
    post = await post_service.create_post(db_session, PostCreate(title="Delete Me", content="body", published=True), user.id)
    await post_service.delete_post(db_session, post.id, user.id)
    assert await post_repository.get_by_id(db_session, post.id) is None


@pytest.mark.anyio
async def test_rollback_discards_uncommitted_post(db_session):
    user = await create_user(db_session)
    await post_service.create_post(db_session, PostCreate(title="Rollback", content="body", published=True), user.id)
    await db_session.rollback()
    rows = (await db_session.execute(select(Post))).scalars().all()
    assert rows == []


@pytest.mark.anyio
async def test_ml_database_uses_separate_metadata(ml_session):
    sample = TrainingSample(text="safe sample", label="appropriate")
    ml_session.add(sample)
    await ml_session.flush()
    assert sample.id is not None
