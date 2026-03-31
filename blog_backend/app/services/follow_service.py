from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.user import User
from app.repositories.user_repository import user_repository


class FollowService:
    async def follow_user(self, db: AsyncSession, follower_id: int, followed_id: int) -> Follow:
        if follower_id == followed_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself")

        target_user = await user_repository.get_by_id(db, followed_id)
        if not target_user or target_user.is_suspended:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        existing = await db.execute(
            select(Follow).where(Follow.follower_id == follower_id, Follow.followed_id == followed_id)
        )
        follow = existing.scalar_one_or_none()
        if follow:
            return follow

        follow = Follow(follower_id=follower_id, followed_id=followed_id)
        db.add(follow)
        await db.flush()
        return follow

    async def unfollow_user(self, db: AsyncSession, follower_id: int, followed_id: int) -> bool:
        result = await db.execute(
            delete(Follow).where(Follow.follower_id == follower_id, Follow.followed_id == followed_id)
        )
        return bool(result.rowcount)

    async def list_followers(self, db: AsyncSession, user_id: int) -> list[User]:
        result = await db.execute(
            select(User).join(Follow, Follow.follower_id == User.id).where(Follow.followed_id == user_id)
        )
        return list(result.scalars().all())

    async def list_following(self, db: AsyncSession, user_id: int) -> list[User]:
        result = await db.execute(
            select(User).join(Follow, Follow.followed_id == User.id).where(Follow.follower_id == user_id)
        )
        return list(result.scalars().all())

    async def get_followed_user_ids(self, db: AsyncSession, user_id: int) -> list[int]:
        result = await db.execute(select(Follow.followed_id).where(Follow.follower_id == user_id))
        return [row[0] for row in result.all()]

    async def get_follower_user_ids(self, db: AsyncSession, user_id: int) -> list[int]:
        result = await db.execute(select(Follow.follower_id).where(Follow.followed_id == user_id))
        return [row[0] for row in result.all()]

    async def get_follow_counts(self, db: AsyncSession, user_id: int) -> tuple[int, int]:
        followers = (
            await db.execute(select(func.count(Follow.id)).where(Follow.followed_id == user_id))
        ).scalar() or 0
        following = (
            await db.execute(select(func.count(Follow.id)).where(Follow.follower_id == user_id))
        ).scalar() or 0
        return followers, following

    async def is_following(self, db: AsyncSession, follower_id: int, followed_id: int) -> bool:
        result = await db.execute(
            select(Follow.id).where(Follow.follower_id == follower_id, Follow.followed_id == followed_id)
        )
        return result.scalar_one_or_none() is not None


follow_service = FollowService()
