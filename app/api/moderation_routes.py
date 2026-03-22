"""
Moderation API routes – preview check, admin review of flagged posts.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.ml.content_moderator import moderator
from app.models.post import Post
from app.models.user import User
from app.schemas.post_schema import (
    ModerationCheckRequest,
    ModerationCheckResponse,
    PostResponse,
)

router = APIRouter(prefix="/api/moderation", tags=["Moderation"])


@router.post("/check", response_model=ModerationCheckResponse)
async def check_content(data: ModerationCheckRequest):
    """Preview-check any text for inappropriate content (no auth required)."""
    result = moderator.check_text(data.text)
    return ModerationCheckResponse(
        label=result.label,
        confidence=result.confidence,
        status=result.status,
        reason=result.reason,
    )


@router.get("/flagged", response_model=List[PostResponse])
async def list_flagged_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all posts with moderation_status='flagged' (admin review)."""
    stmt = select(Post).where(Post.moderation_status == "flagged")
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a flagged post (admin action)."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.moderation_status != "flagged":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Post is not flagged (current status: {post.moderation_status})",
        )
    post.moderation_status = "approved"
    post.published = True
    await db.flush()
    await db.refresh(post)
    return post


@router.put("/{post_id}/reject", response_model=PostResponse)
async def reject_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject a flagged post (admin action)."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.moderation_status not in ("flagged", "approved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Post cannot be rejected (current status: {post.moderation_status})",
        )
    post.moderation_status = "rejected"
    post.published = False
    await db.flush()
    await db.refresh(post)
    return post
