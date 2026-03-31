from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.user_schema import Token, UserCreate, UserLogin, UserResponse, UserUpdate
from app.services.user_service import user_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    user = await user_service.register(db, data)
    return await user_service.serialize_user(db, user)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    return await user_service.authenticate(db, data.email, data.password)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently authenticated user's profile."""
    return await user_service.serialize_user(db, current_user)


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination."""
    users = await user_service.get_all_users(db, skip=skip, limit=limit)
    return [await user_service.serialize_user(db, user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get a user by ID."""
    user = await user_service.get_user(db, user_id)
    return await user_service.serialize_user(db, user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user (authenticated)."""
    user = await user_service.update_user(db, user_id, data)
    return await user_service.serialize_user(db, user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user (authenticated)."""
    await user_service.delete_user(db, user_id)
