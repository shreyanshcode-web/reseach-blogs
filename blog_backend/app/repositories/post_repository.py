from typing import Optional, Sequence

from sqlalchemy import String, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.post import Post
from app.models.user import User


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
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
    ) -> Sequence[Post]:
        stmt = select(Post).options(joinedload(Post.author)).offset(skip).limit(limit)
        if current_user_id is None:
            stmt = stmt.where(
                Post.published.is_(True),
                Post.is_suspended.is_(False),
                Post.moderation_status != "explicit",
            )
        else:
            stmt = stmt.where(
                or_(
                    Post.published.is_(True),
                    Post.author_id == current_user_id,
                ),
                or_(
                    Post.is_suspended.is_(False),
                    Post.author_id == current_user_id,
                ),
            )
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def get_by_author(
        self,
        db: AsyncSession,
        author_id: int,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
    ) -> Sequence[Post]:
        stmt = (
            select(Post)
            .options(joinedload(Post.author))
            .where(Post.author_id == author_id)
            .offset(skip)
            .limit(limit)
        )
        if current_user_id is None or current_user_id != author_id:
            stmt = stmt.where(
                Post.published.is_(True),
                Post.is_suspended.is_(False),
                Post.moderation_status != "explicit",
            )
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    async def search(
        self,
        db: AsyncSession,
        query: str,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
    ) -> Sequence[Post]:
        pattern = f"%{query.strip()}%"
        stmt = (
            select(Post)
            .join(User, User.id == Post.author_id)
            .options(joinedload(Post.author))
            .where(
                or_(
                    Post.title.ilike(pattern),
                    User.username.ilike(pattern),
                    cast(Post.content, String).ilike(pattern),
                )
            )
            .offset(skip)
            .limit(limit)
        )
        if current_user_id is None:
            stmt = stmt.where(
                Post.published.is_(True),
                Post.is_suspended.is_(False),
                Post.moderation_status != "explicit",
            )
        else:
            stmt = stmt.where(
                or_(Post.published.is_(True), Post.author_id == current_user_id),
                or_(Post.is_suspended.is_(False), Post.author_id == current_user_id),
            )
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
