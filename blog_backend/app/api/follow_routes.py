from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.follow_schema import (
    FollowActionResponse,
    FollowListResponse,
    FollowStatusResponse,
)
from app.services.follow_service import follow_service
from app.services.timeline_events import timeline_event_bus


router = APIRouter(prefix="/api/follows", tags=["Follows"])


@router.post("/{target_user_id}", response_model=FollowActionResponse, status_code=status.HTTP_201_CREATED)
async def follow_user(
    target_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow = await follow_service.follow_user(db, current_user.id, target_user_id)
    await db.commit()
    await timeline_event_bus.publish(
        "follow.created",
        {"follower_id": current_user.id, "followed_id": target_user_id},
    )
    return FollowActionResponse(
        detail="Followed user",
        target_user_id=target_user_id,
        created_at=follow.created_at,
    )


@router.delete("/{target_user_id}", response_model=FollowActionResponse)
async def unfollow_user(
    target_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await follow_service.unfollow_user(db, current_user.id, target_user_id)
    await db.commit()
    await timeline_event_bus.publish(
        "follow.deleted",
        {"follower_id": current_user.id, "followed_id": target_user_id},
    )
    return FollowActionResponse(detail="Unfollowed user", target_user_id=target_user_id)


@router.get("/me/followers", response_model=FollowListResponse)
async def get_my_followers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = await follow_service.list_followers(db, current_user.id)
    return FollowListResponse(users=users)


@router.get("/me/following", response_model=FollowListResponse)
async def get_my_following(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = await follow_service.list_following(db, current_user.id)
    return FollowListResponse(users=users)


@router.get("/status/{target_user_id}", response_model=FollowStatusResponse)
async def get_follow_status(
    target_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    followers_count, following_count = await follow_service.get_follow_counts(db, target_user_id)
    is_following = False
    if current_user is not None:
        is_following = await follow_service.is_following(db, current_user.id, target_user_id)
    return FollowStatusResponse(
        target_user_id=target_user_id,
        is_following=is_following,
        followers_count=followers_count,
        following_count=following_count,
    )
