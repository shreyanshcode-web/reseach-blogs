from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.post import Post


class PostRepository:

    async def create(self, db: AsyncSession, post: Post) -> Post:
        db.add(post)
        await db.flush()
        await db.refresh(post, attribute_names=["author"])
        return post

    async def get_by_id(self, db: AsyncSession, post_id: int) -> Optional[Post]:
        result = await db.execute(
            select(Post).options(joinedload(Post.author)).where(Post.id == post_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, db: AsyncSession, skip: int = 0, limit: int = 100, is_authenticated: bool = False
    ) -> Sequence[Post]:
        stmt = select(Post).options(joinedload(Post.author)).offset(skip).limit(limit)
        if not is_authenticated:
            stmt = stmt.where(Post.moderation_status != "explicit")
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def get_by_author(
        self, db: AsyncSession, author_id: int, skip: int = 0, limit: int = 100, is_authenticated: bool = False
    ) -> Sequence[Post]:
        stmt = (
            select(Post)
            .options(joinedload(Post.author))
            .where(Post.author_id == author_id)
            .offset(skip)
            .limit(limit)
        )
        if not is_authenticated:
            stmt = stmt.where(Post.moderation_status != "explicit")
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def update(self, db: AsyncSession, post: Post, **kwargs) -> Post:
        for key, value in kwargs.items():
            if value is not None:
                setattr(post, key, value)
        await db.flush()
        await db.refresh(post, attribute_names=["author"])
        return post

    async def delete(self, db: AsyncSession, post: Post) -> None:
        await db.delete(post)
        await db.flush()


post_repository = PostRepository()
