from typing import Optional, Sequence
import re
import secrets

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.services.follow_service import follow_service
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.schemas.user_schema import Token, UserCreate, UserUpdate


def _clean_username(value: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    candidate = re.sub(r"_+", "_", candidate).strip("_")
    return candidate[:50] or "writer"


class UserService:

    async def register(self, db: AsyncSession, data: UserCreate) -> User:
        # Normalize incoming credentials for consistent storage and lookup
        email = data.email.strip().lower()
        username = data.username.strip().lower()

        if await user_repository.get_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        if await user_repository.get_by_username(db, username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(data.password),
        )
        return await user_repository.create(db, user)

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> Token:
        normalized_email = email.strip().lower()
        user = await user_repository.get_by_email(db, normalized_email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = create_access_token(data={"sub": str(user.id)})
        return Token(access_token=token)

    async def get_or_create_clerk_user(self, db: AsyncSession, claims: dict) -> User:
        email = (claims.get("email") or "").strip().lower()
        clerk_id = claims.get("sub")

        if not email:
            if not clerk_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Clerk authentication returned no email and no user ID",
                )
            # Generate a synthetic email for users without an email claim (common in default Clerk tokens)
            email = f"clerk_{clerk_id}@clerk.user"

        user = await user_repository.get_by_email(db, email)
        if user:
            return user

        preferred = claims.get("username") or claims.get("email") or "writer"
        username = _clean_username(preferred)
        original_username = username
        suffix = 1
        while await user_repository.get_by_username(db, username):
            suffix += 1
            username = f"{original_username}_{suffix}"

        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
        )
        return await user_repository.create(db, user)

    async def serialize_user(self, db: AsyncSession, user: User) -> dict:
        followers_count, following_count = await follow_service.get_follow_counts(db, user.id)
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "is_suspended": user.is_suspended,
            "followers_count": followers_count,
            "following_count": following_count,
            "created_at": user.created_at,
        }

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
