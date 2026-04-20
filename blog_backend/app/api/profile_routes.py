from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import timezone

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.post import Post
from app.models.user import User
from app.models.user_profile import UserProfile
from app.services.follow_service import follow_service
from app.schemas.profile_schema import ProfileResponse, ProfileUpdate, PublicPortfolioResponse

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def _normalize_datetime(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ── Get Own Profile ──────────────────────────────────────────────

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the authenticated user's full profile."""
    # Eagerly load profile
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    user = result.scalar_one()

    profile = user.profile
    post_count = (await db.execute(
        select(func.count(Post.id)).where(Post.author_id == user.id)
    )).scalar() or 0
    followers_count, following_count = await follow_service.get_follow_counts(db, user.id)

    return ProfileResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
        display_name=profile.display_name if profile else None,
        bio=profile.bio if profile else None,
        tagline=profile.tagline if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        cover_image_url=profile.cover_image_url if profile else None,
        location=profile.location if profile else None,
        website_url=profile.website_url if profile else None,
        phone=profile.phone if profile else None,
        github_url=profile.github_url if profile else None,
        twitter_url=profile.twitter_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        instagram_url=profile.instagram_url if profile else None,
        youtube_url=profile.youtube_url if profile else None,
        skills=profile.skills if profile else None,
        experience=profile.experience if profile else None,
        education=profile.education if profile else None,
        certifications=profile.certifications if profile else None,
        projects=profile.projects if profile else None,
        total_posts=post_count,
        followers_count=followers_count,
        following_count=following_count,
        member_since=user.created_at.isoformat(),
    )


# ── Update Own Profile ───────────────────────────────────────────

@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the authenticated user's profile (creates if not exists)."""
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    user = result.scalar_one()

    profile = user.profile
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    update_fields = data.model_dump(exclude_unset=True)
    for key, value in update_fields.items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)

    post_count = (await db.execute(
        select(func.count(Post.id)).where(Post.author_id == user.id)
    )).scalar() or 0
    followers_count, following_count = await follow_service.get_follow_counts(db, user.id)

    return ProfileResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
        display_name=profile.display_name,
        bio=profile.bio,
        tagline=profile.tagline,
        avatar_url=profile.avatar_url,
        cover_image_url=profile.cover_image_url,
        location=profile.location,
        website_url=profile.website_url,
        phone=profile.phone,
        github_url=profile.github_url,
        twitter_url=profile.twitter_url,
        linkedin_url=profile.linkedin_url,
        instagram_url=profile.instagram_url,
        youtube_url=profile.youtube_url,
        skills=profile.skills,
        experience=profile.experience,
        education=profile.education,
        certifications=profile.certifications,
        projects=profile.projects,
        total_posts=post_count,
        followers_count=followers_count,
        following_count=following_count,
        member_since=user.created_at.isoformat(),
    )


# ── Public Portfolio ─────────────────────────────────────────────

@router.get("/{username}", response_model=PublicPortfolioResponse)
async def get_public_portfolio(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a user's public portfolio by username (no auth required)."""
    result = await db.execute(
        select(User).options(selectinload(User.profile), selectinload(User.posts))
        .where(User.username == username)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="This account has been suspended")

    profile = user.profile
    post_count = len([p for p in user.posts if p.published and not p.is_suspended])
    followers_count, following_count = await follow_service.get_follow_counts(db, user.id)

    # Recent published posts (last 5)
    recent = sorted(
        [p for p in user.posts if p.published and not p.is_suspended],
        key=lambda p: _normalize_datetime(p.created_at),
        reverse=True,
    )[:5]
    recent_posts = [
        {"id": p.id, "title": p.title, "created_at": p.created_at.isoformat()}
        for p in recent
    ]

    return PublicPortfolioResponse(
        user_id=user.id,
        username=user.username,
        display_name=profile.display_name if profile else user.username,
        bio=profile.bio if profile else None,
        tagline=profile.tagline if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        cover_image_url=profile.cover_image_url if profile else None,
        location=profile.location if profile else None,
        website_url=profile.website_url if profile else None,
        github_url=profile.github_url if profile else None,
        twitter_url=profile.twitter_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        instagram_url=profile.instagram_url if profile else None,
        youtube_url=profile.youtube_url if profile else None,
        skills=profile.skills if profile else None,
        experience=profile.experience if profile else None,
        education=profile.education if profile else None,
        certifications=profile.certifications if profile else None,
        projects=profile.projects if profile else None,
        total_posts=post_count,
        followers_count=followers_count,
        following_count=following_count,
        member_since=user.created_at.isoformat(),
        recent_posts=recent_posts,
    )
