from typing import Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.schemas.user_schema import Token, UserCreate, UserUpdate


class UserService:

    async def register(self, db: AsyncSession, data: UserCreate) -> User:
        # Check uniqueness
        if await user_repository.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        if await user_repository.get_by_username(db, data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
        )
        return await user_repository.create(db, user)

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> Token:
        user = await user_repository.get_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = create_access_token(data={"sub": str(user.id)})
        return Token(access_token=token)

    async def get_user(self, db: AsyncSession, user_id: int) -> User:
        user = await user_repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    async def get_all_users(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> Sequence[User]:
        return await user_repository.get_all(db, skip=skip, limit=limit)

    async def update_user(
        self, db: AsyncSession, user_id: int, data: UserUpdate
    ) -> User:
        user = await self.get_user(db, user_id)
        update_data = data.model_dump(exclude_unset=True)
        return await user_repository.update(db, user, **update_data)

    async def delete_user(self, db: AsyncSession, user_id: int) -> None:
        user = await self.get_user(db, user_id)
        await user_repository.delete(db, user)


user_service = UserService()
