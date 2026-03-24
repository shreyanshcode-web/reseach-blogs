import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_admin_user, get_current_user
from app.models.analytics import Engagement, PageView
from app.models.post import Post
from app.models.user import User

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ── Schemas ──────────────────────────────────────────────────────

class RecordViewRequest(BaseModel):
    post_id: Optional[int] = None
    page_path: Optional[str] = None


class RecordEngagementRequest(BaseModel):
    post_id: int
    type: str = Field(..., description="like, share, bookmark, or comment")


class PostStatsResponse(BaseModel):
    post_id: int
    title: str
    total_views: int
    unique_visitors: int
    total_engagements: int
    likes: int
    shares: int
    bookmarks: int


class DashboardResponse(BaseModel):
    total_views: int
    unique_visitors: int
    total_engagements: int
    total_posts: int
    views_this_week: int
    views_last_week: int
    growth_percent: float
    top_posts: List[PostStatsResponse]


class PlatformStatsResponse(BaseModel):
    total_views: int
    total_engagements: int
    unique_visitors: int
    total_users: int
    total_posts: int
    views_today: int
    views_this_week: int


# ── Record View ──────────────────────────────────────────────────

@router.post("/view", status_code=status.HTTP_201_CREATED)
async def record_view(
    data: RecordViewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Record a page view — called by frontend on each page load."""
    # Hash the IP for privacy-safe unique visitor counting
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]

    view = PageView(
        post_id=data.post_id,
        ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:500],
        referrer=request.headers.get("referer", "")[:500],
        page_path=data.page_path,
    )
    db.add(view)
    await db.commit()
    return {"detail": "View recorded"}


# ── Record Engagement ────────────────────────────────────────────

@router.post("/engage", status_code=status.HTTP_201_CREATED)
async def record_engagement(
    data: RecordEngagementRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a user engagement (like/share/bookmark)."""
    if data.type not in ("like", "share", "bookmark", "comment"):
        raise HTTPException(status_code=400, detail="Type must be: like, share, bookmark, or comment")

    # Check for duplicate likes/bookmarks
    if data.type in ("like", "bookmark"):
        existing = await db.execute(
            select(Engagement).where(
                and_(
                    Engagement.post_id == data.post_id,
                    Engagement.user_id == current_user.id,
                    Engagement.type == data.type,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Already {data.type}d this post")

    engagement = Engagement(
        post_id=data.post_id,
        user_id=current_user.id,
        type=data.type,
    )
    db.add(engagement)
    await db.commit()
    return {"detail": f"{data.type.capitalize()} recorded"}


# ── User Dashboard ───────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
async def get_user_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the authenticated user's analytics dashboard."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # Get all post IDs by this user
    user_posts = await db.execute(
        select(Post.id, Post.title).where(Post.author_id == current_user.id)
    )
    posts_list = user_posts.all()
    post_ids = [p.id for p in posts_list]

    if not post_ids:
        return DashboardResponse(
            total_views=0, unique_visitors=0, total_engagements=0,
            total_posts=0, views_this_week=0, views_last_week=0,
            growth_percent=0.0, top_posts=[],
        )

    # Total views across all user posts
    total_views = (await db.execute(
        select(func.count(PageView.id)).where(PageView.post_id.in_(post_ids))
    )).scalar() or 0

    # Unique visitors
    unique_visitors = (await db.execute(
        select(func.count(func.distinct(PageView.ip_hash))).where(PageView.post_id.in_(post_ids))
    )).scalar() or 0

    # Total engagements
    total_engagements = (await db.execute(
        select(func.count(Engagement.id)).where(Engagement.post_id.in_(post_ids))
    )).scalar() or 0

    # Weekly growth
    views_this_week = (await db.execute(
        select(func.count(PageView.id)).where(
            and_(PageView.post_id.in_(post_ids), PageView.created_at >= week_ago)
        )
    )).scalar() or 0

    views_last_week = (await db.execute(
        select(func.count(PageView.id)).where(
            and_(
                PageView.post_id.in_(post_ids),
                PageView.created_at >= two_weeks_ago,
                PageView.created_at < week_ago,
            )
        )
    )).scalar() or 0

    growth = 0.0
    if views_last_week > 0:
        growth = round(((views_this_week - views_last_week) / views_last_week) * 100, 1)
    elif views_this_week > 0:
        growth = 100.0

    # Top posts by views
    top_posts = []
    for p in posts_list[:10]:
        pv = (await db.execute(
            select(func.count(PageView.id)).where(PageView.post_id == p.id)
        )).scalar() or 0
        uv = (await db.execute(
            select(func.count(func.distinct(PageView.ip_hash))).where(PageView.post_id == p.id)
        )).scalar() or 0
        eng = (await db.execute(
            select(func.count(Engagement.id)).where(Engagement.post_id == p.id)
        )).scalar() or 0
        likes = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(Engagement.post_id == p.id, Engagement.type == "like")
            )
        )).scalar() or 0
        shares = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(Engagement.post_id == p.id, Engagement.type == "share")
            )
        )).scalar() or 0
        bookmarks = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(Engagement.post_id == p.id, Engagement.type == "bookmark")
            )
        )).scalar() or 0
        top_posts.append(PostStatsResponse(
            post_id=p.id, title=p.title,
            total_views=pv, unique_visitors=uv,
            total_engagements=eng, likes=likes,
            shares=shares, bookmarks=bookmarks,
        ))

    top_posts.sort(key=lambda x: x.total_views, reverse=True)

    return DashboardResponse(
        total_views=total_views,
        unique_visitors=unique_visitors,
        total_engagements=total_engagements,
        total_posts=len(post_ids),
        views_this_week=views_this_week,
        views_last_week=views_last_week,
        growth_percent=growth,
        top_posts=top_posts,
    )


# ── Per-Post Stats ───────────────────────────────────────────────

@router.get("/post/{post_id}/stats", response_model=PostStatsResponse)
async def get_post_stats(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed analytics for a specific post (author only)."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    total_views = (await db.execute(
        select(func.count(PageView.id)).where(PageView.post_id == post_id)
    )).scalar() or 0
    unique_visitors = (await db.execute(
        select(func.count(func.distinct(PageView.ip_hash))).where(PageView.post_id == post_id)
    )).scalar() or 0
    total_eng = (await db.execute(
        select(func.count(Engagement.id)).where(Engagement.post_id == post_id)
    )).scalar() or 0
    likes = (await db.execute(
        select(func.count(Engagement.id)).where(
            and_(Engagement.post_id == post_id, Engagement.type == "like")
        )
    )).scalar() or 0
    shares = (await db.execute(
        select(func.count(Engagement.id)).where(
            and_(Engagement.post_id == post_id, Engagement.type == "share")
        )
    )).scalar() or 0
    bookmarks = (await db.execute(
        select(func.count(Engagement.id)).where(
            and_(Engagement.post_id == post_id, Engagement.type == "bookmark")
        )
    )).scalar() or 0

    return PostStatsResponse(
        post_id=post_id, title=post.title,
        total_views=total_views, unique_visitors=unique_visitors,
        total_engagements=total_eng, likes=likes,
        shares=shares, bookmarks=bookmarks,
    )


# ── Admin Platform Analytics ─────────────────────────────────────

@router.get("/platform", response_model=PlatformStatsResponse)
async def get_platform_analytics(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Admin-only global platform metrics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_views = (await db.execute(select(func.count(PageView.id)))).scalar() or 0
    total_eng = (await db.execute(select(func.count(Engagement.id)))).scalar() or 0
    unique_visitors = (await db.execute(
        select(func.count(func.distinct(PageView.ip_hash)))
    )).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_posts = (await db.execute(select(func.count(Post.id)))).scalar() or 0
    views_today = (await db.execute(
        select(func.count(PageView.id)).where(PageView.created_at >= today_start)
    )).scalar() or 0
    views_this_week = (await db.execute(
        select(func.count(PageView.id)).where(PageView.created_at >= week_ago)
    )).scalar() or 0

    return PlatformStatsResponse(
        total_views=total_views, total_engagements=total_eng,
        unique_visitors=unique_visitors, total_users=total_users,
        total_posts=total_posts, views_today=views_today,
        views_this_week=views_this_week,
    )


# ── Weekly Top Posts ─────────────────────────────────────────────

from app.models.weekly_top import WeeklyTopPost


class WeeklyTopPostResponse(BaseModel):
    rank: int
    post_id: int
    title: str
    author: str
    likes: int
    shares: int
    bookmarks: int
    total_views: int
    engagement_score: float
    week_start: datetime
    week_end: datetime


class WeeklyTopListResponse(BaseModel):
    week_start: datetime
    week_end: datetime
    computed_at: Optional[datetime] = None
    posts: List[WeeklyTopPostResponse]


@router.post("/weekly-top/compute")
async def compute_weekly_top_posts(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """
    Compute and store the top 10 best-performing posts of the current week.

    Engagement score = likes + (shares × 2) + bookmarks + (views × 0.1)

    Call this manually or via a cron job once per week.
    """
    now = datetime.now(timezone.utc)
    # Week starts on Monday
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end = week_start + timedelta(days=7)

    # ── Delete old entries for this week (re-compute) ──
    from sqlalchemy import delete
    await db.execute(
        delete(WeeklyTopPost).where(WeeklyTopPost.week_start == week_start)
    )
    await db.flush()

    # ── Get all published, non-suspended posts ──
    posts_result = await db.execute(
        select(Post.id, Post.title, Post.author_id).where(
            and_(
                Post.published == True,
                Post.is_suspended == False,
            )
        )
    )
    all_posts = posts_result.all()

    if not all_posts:
        return {"detail": "No published posts found", "top_posts": []}

    # ── Aggregate engagement for each post this week ──
    scored_posts = []

    for post_row in all_posts:
        pid = post_row.id

        # Count likes this week
        likes = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(
                    Engagement.post_id == pid,
                    Engagement.type == "like",
                    Engagement.created_at >= week_start,
                    Engagement.created_at < week_end,
                )
            )
        )).scalar() or 0

        # Count shares this week
        shares = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(
                    Engagement.post_id == pid,
                    Engagement.type == "share",
                    Engagement.created_at >= week_start,
                    Engagement.created_at < week_end,
                )
            )
        )).scalar() or 0

        # Count bookmarks this week
        bookmarks = (await db.execute(
            select(func.count(Engagement.id)).where(
                and_(
                    Engagement.post_id == pid,
                    Engagement.type == "bookmark",
                    Engagement.created_at >= week_start,
                    Engagement.created_at < week_end,
                )
            )
        )).scalar() or 0

        # Count views this week
        views = (await db.execute(
            select(func.count(PageView.id)).where(
                and_(
                    PageView.post_id == pid,
                    PageView.created_at >= week_start,
                    PageView.created_at < week_end,
                )
            )
        )).scalar() or 0

        # Weighted engagement score
        score = likes + (shares * 2) + bookmarks + (views * 0.1)

        if score > 0:
            scored_posts.append({
                "post_id": pid,
                "title": post_row.title,
                "likes": likes,
                "shares": shares,
                "bookmarks": bookmarks,
                "total_views": views,
                "engagement_score": round(score, 2),
            })

    # ── Sort by score and take top 10 ──
    scored_posts.sort(key=lambda x: x["engagement_score"], reverse=True)
    top_10 = scored_posts[:10]

    # ── Store in DB ──
    for rank, post_data in enumerate(top_10, start=1):
        entry = WeeklyTopPost(
            post_id=post_data["post_id"],
            week_start=week_start,
            week_end=week_end,
            rank=rank,
            likes=post_data["likes"],
            shares=post_data["shares"],
            bookmarks=post_data["bookmarks"],
            total_views=post_data["total_views"],
            engagement_score=post_data["engagement_score"],
        )
        db.add(entry)

    await db.flush()

    return {
        "detail": f"Computed top {len(top_10)} posts for week {week_start.date()} → {week_end.date()}",
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "top_posts": top_10,
    }


@router.get("/weekly-top", response_model=WeeklyTopListResponse)
async def get_weekly_top_posts(
    db: AsyncSession = Depends(get_db),
):
    """
    Get the best blogs of the current week (public, no auth required).
    Returns the top posts ranked by engagement score.
    """
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(WeeklyTopPost)
        .where(WeeklyTopPost.week_start == week_start)
        .order_by(WeeklyTopPost.rank)
    )
    entries = result.scalars().all()

    posts_response = []
    for entry in entries:
        post = await db.get(Post, entry.post_id)
        if not post:
            continue
        author = await db.get(User, post.author_id)
        posts_response.append(WeeklyTopPostResponse(
            rank=entry.rank,
            post_id=entry.post_id,
            title=post.title,
            author=author.username if author else "deleted",
            likes=entry.likes,
            shares=entry.shares,
            bookmarks=entry.bookmarks,
            total_views=entry.total_views,
            engagement_score=entry.engagement_score,
            week_start=entry.week_start,
            week_end=entry.week_end,
        ))

    return WeeklyTopListResponse(
        week_start=week_start,
        week_end=week_end,
        computed_at=entries[0].computed_at if entries else None,
        posts=posts_response,
    )


@router.get("/weekly-top/history", response_model=WeeklyTopListResponse)
async def get_weekly_top_history(
    week_offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Get top posts for a specific week. Use week_offset=0 for current week,
    week_offset=1 for last week, etc.
    """
    now = datetime.now(timezone.utc)
    target = now - timedelta(weeks=week_offset)
    week_start = (target - timedelta(days=target.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end = week_start + timedelta(days=7)

    result = await db.execute(
        select(WeeklyTopPost)
        .where(WeeklyTopPost.week_start == week_start)
        .order_by(WeeklyTopPost.rank)
    )
    entries = result.scalars().all()

    posts_response = []
    for entry in entries:
        post = await db.get(Post, entry.post_id)
        if not post:
            continue
        author = await db.get(User, post.author_id)
        posts_response.append(WeeklyTopPostResponse(
            rank=entry.rank,
            post_id=entry.post_id,
            title=post.title,
            author=author.username if author else "deleted",
            likes=entry.likes,
            shares=entry.shares,
            bookmarks=entry.bookmarks,
            total_views=entry.total_views,
            engagement_score=entry.engagement_score,
            week_start=entry.week_start,
            week_end=entry.week_end,
        ))

    return WeeklyTopListResponse(
        week_start=week_start,
        week_end=week_end,
        computed_at=entries[0].computed_at if entries else None,
        posts=posts_response,
    )

