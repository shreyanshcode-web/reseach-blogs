from typing import Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:

    async def create(self, db: AsyncSession, user: User) -> User:
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def get_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        result = await db.execute(
            select(User).where(func.lower(User.email) == normalized_email)
        )
        return result.scalar_one_or_none()

    async def get_by_username(
        self, db: AsyncSession, username: str
    ) -> Optional[User]:
        normalized_username = username.strip().lower()
        result = await db.execute(
            select(User).where(func.lower(User.username) == normalized_username)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> Sequence[User]:
        result = await db.execute(select(User).offset(skip).limit(limit))
        return result.scalars().all()

    async def update(self, db: AsyncSession, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            if value is not None:
                setattr(user, key, value)
        await db.flush()
        await db.refresh(user)
        return user

    async def delete(self, db: AsyncSession, user: User) -> None:
        await db.delete(user)
        await db.flush()


user_repository = UserRepository()
