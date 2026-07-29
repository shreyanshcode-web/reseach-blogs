from typing import Optional, Sequence

from sqlalchemy import String, asc, cast, desc, func, or_, select
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

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Optional[Post]:
        result = await db.execute(
            select(Post).options(joinedload(Post.author)).where(Post.slug == slug)
        )
        return result.scalar_one_or_none()

    async def slug_exists(self, db: AsyncSession, slug: str, exclude_post_id: int | None = None) -> bool:
        stmt = select(func.count(Post.id)).where(Post.slug == slug)
        if exclude_post_id is not None:
            stmt = stmt.where(Post.id != exclude_post_id)
        return bool((await db.execute(stmt)).scalar() or 0)

    def _apply_sort(self, stmt, sort: str):
        match sort:
            case "oldest":
                return stmt.order_by(asc(Post.created_at))
            case "most_viewed":
                return stmt.order_by(desc(Post.view_count), desc(Post.created_at))
            case "alphabetical":
                return stmt.order_by(asc(func.lower(Post.title)))
            case _:
                return stmt.order_by(desc(Post.created_at))

    async def get_all(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        stmt = select(Post).options(joinedload(Post.author))
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
        result = await db.execute(self._apply_sort(stmt, sort).offset(skip).limit(limit))
        return result.scalars().unique().all()

    async def get_by_author(
        self,
        db: AsyncSession,
        author_id: int,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        stmt = (
            select(Post)
            .options(joinedload(Post.author))
            .where(Post.author_id == author_id)
        )
        if current_user_id is None or current_user_id != author_id:
            stmt = stmt.where(
                Post.published.is_(True),
                Post.is_suspended.is_(False),
                Post.moderation_status != "explicit",
            )
        result = await db.execute(self._apply_sort(stmt, sort).offset(skip).limit(limit))
        return result.scalars().unique().all()

    async def search(
        self,
        db: AsyncSession,
        query: str,
        skip: int = 0,
        limit: int = 100,
        current_user_id: int | None = None,
        sort: str = "newest",
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
                    cast(Post.tags, String).ilike(pattern),
                )
            )
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
        result = await db.execute(self._apply_sort(stmt, sort).offset(skip).limit(limit))
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
