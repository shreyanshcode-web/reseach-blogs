from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.middleware.auth_middleware import get_admin_user
from app.models.post import Post
from app.models.user import User
from app.schemas.admin_schema import (
    AdminDashboardStats,
    AdminPostResponse,
    AdminPromoteUser,
    AdminSuspendPost,
    AdminSuspendUser,
    AdminUpdatePostStatus,
    AdminUserResponse,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Dashboard ────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Get aggregated dashboard statistics."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_posts = (await db.execute(select(func.count(Post.id)))).scalar() or 0
    suspended_users = (await db.execute(
        select(func.count(User.id)).where(User.is_suspended == True)
    )).scalar() or 0
    suspended_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.is_suspended == True)
    )).scalar() or 0
    pending_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.moderation_status == "pending")
    )).scalar() or 0
    approved_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.moderation_status == "approved")
    )).scalar() or 0
    rejected_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.moderation_status == "rejected")
    )).scalar() or 0
    admin_count = (await db.execute(
        select(func.count(User.id)).where(User.is_admin == True)
    )).scalar() or 0

    return AdminDashboardStats(
        total_users=total_users,
        total_posts=total_posts,
        suspended_users=suspended_users,
        suspended_posts=suspended_posts,
        pending_posts=pending_posts,
        approved_posts=approved_posts,
        rejected_posts=rejected_posts,
        admin_count=admin_count,
    )


# ── User Management ─────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List all users with admin-level detail."""
    result = await db.execute(
        select(User).options(selectinload(User.posts)).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return [
        AdminUserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_active=u.is_active,
            is_verified=u.is_verified,
            is_admin=u.is_admin,
            is_suspended=u.is_suspended,
            suspended_reason=u.suspended_reason,
            created_at=u.created_at.isoformat(),
            post_count=len(u.posts),
        )
        for u in users
    ]


@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    data: AdminSuspendUser,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Suspend a user account."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    user.is_suspended = True
    user.suspended_reason = data.reason
    await db.commit()
    return {"detail": f"User '{user.username}' has been suspended", "reason": data.reason}


@router.put("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Restore a suspended user account."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_suspended = False
    user.suspended_reason = None
    await db.commit()
    return {"detail": f"User '{user.username}' has been unsuspended"}


@router.put("/users/{user_id}/promote")
async def promote_user(
    user_id: int,
    data: AdminPromoteUser,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Promote or demote a user to/from admin."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = data.is_admin
    await db.commit()
    action = "promoted to admin" if data.is_admin else "demoted from admin"
    return {"detail": f"User '{user.username}' has been {action}"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Permanently delete a user and all their posts."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.delete(user)
    await db.commit()


# ── Post Management ──────────────────────────────────────────────

@router.get("/posts", response_model=List[AdminPostResponse])
async def list_all_posts(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List all posts including suspended ones."""
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).offset(skip).limit(limit)
    )
    posts = result.scalars().all()
    return [
        AdminPostResponse(
            id=p.id,
            title=p.title,
            published=p.published,
            moderation_status=p.moderation_status,
            moderation_score=p.moderation_score,
            is_suspended=p.is_suspended,
            suspended_reason=p.suspended_reason,
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
            author_id=p.author_id,
            author_username=p.author.username if p.author else "deleted",
        )
        for p in posts
    ]


@router.put("/posts/{post_id}/suspend")
async def suspend_post(
    post_id: int,
    data: AdminSuspendPost,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Suspend (hide) a post."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_suspended = True
    post.suspended_reason = data.reason
    await db.commit()
    return {"detail": f"Post '{post.title}' has been suspended", "reason": data.reason}


@router.put("/posts/{post_id}/unsuspend")
async def unsuspend_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Restore a suspended post."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_suspended = False
    post.suspended_reason = None
    await db.commit()
    return {"detail": f"Post '{post.title}' has been unsuspended"}


@router.put("/posts/{post_id}/status")
async def update_post_moderation_status(
    post_id: int,
    data: AdminUpdatePostStatus,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Update the moderation status of a post (approved/rejected/pending)."""
    if data.moderation_status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Status must be: approved, rejected, or pending")
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.moderation_status = data.moderation_status
    await db.commit()
    return {"detail": f"Post '{post.title}' status updated to '{data.moderation_status}'"}


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Permanently delete a post."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.delete(post)
    await db.commit()
