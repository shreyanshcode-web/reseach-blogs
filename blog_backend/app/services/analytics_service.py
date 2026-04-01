from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import PageView
from app.models.follow import Follow
from app.models.post import Post
from app.models.user import User


class AnalyticsService:
    async def build_user_dashboard(self, db: AsyncSession, user: User) -> dict:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        current_day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        user_posts_result = await db.execute(
            select(Post)
            .where(Post.author_id == user.id)
            .order_by(Post.view_count.desc(), Post.created_at.desc())
        )
        user_posts = user_posts_result.scalars().all()

        total_followers = (
            await db.execute(select(func.count(Follow.id)).where(Follow.followed_id == user.id))
        ).scalar() or 0
        followers_gained_this_week = (
            await db.execute(
                select(func.count(Follow.id)).where(
                    and_(Follow.followed_id == user.id, Follow.created_at >= week_ago)
                )
            )
        ).scalar() or 0
        followers_gained_last_week = (
            await db.execute(
                select(func.count(Follow.id)).where(
                    and_(
                        Follow.followed_id == user.id,
                        Follow.created_at >= two_weeks_ago,
                        Follow.created_at < week_ago,
                    )
                )
            )
        ).scalar() or 0
        follower_growth = self._growth_percent(followers_gained_this_week, followers_gained_last_week)

        if not user_posts:
            return {
                "total_views": 0,
                "unique_visitors": 0,
                "total_engagements": 0,
                "total_posts": 0,
                "views_this_week": 0,
                "views_last_week": 0,
                "growth_percent": 0.0,
                "reach_this_week": 0,
                "reach_last_week": 0,
                "reach_growth_percent": 0.0,
                "followers": {
                    "total_followers": total_followers,
                    "gained_this_week": followers_gained_this_week,
                    "gained_last_week": followers_gained_last_week,
                    "growth_percent": follower_growth,
                },
                "avg_engagement_rate": 0.0,
                "post_performance": [],
                "reach_series": [],
                "top_posts": [],
            }

        post_ids = [post.id for post in user_posts]
        total_views = sum(post.view_count for post in user_posts)
        total_engagements = sum(
            post.like_count + post.share_count + post.bookmark_count + post.comment_count
            for post in user_posts
        )

        unique_visitors = await self._count_distinct_visitors(db, post_ids)
        views_this_week = await self._count_views_in_range(db, post_ids, week_ago, None)
        views_last_week = await self._count_views_in_range(db, post_ids, two_weeks_ago, week_ago)
        reach_this_week = await self._count_distinct_visitors(db, post_ids, week_ago, None)
        reach_last_week = await self._count_distinct_visitors(db, post_ids, two_weeks_ago, week_ago)

        post_performance = []
        for post in user_posts:
            unique_post_visitors = await self._count_distinct_visitors(db, [post.id])
            total_post_engagements = post.like_count + post.share_count + post.bookmark_count + post.comment_count
            engagement_rate = round((total_post_engagements / post.view_count) * 100, 1) if post.view_count else 0.0
            post_performance.append(
                {
                    "post_id": post.id,
                    "title": post.title,
                    "total_views": post.view_count,
                    "unique_visitors": unique_post_visitors,
                    "total_engagements": total_post_engagements,
                    "likes": post.like_count,
                    "shares": post.share_count,
                    "bookmarks": post.bookmark_count,
                    "comments": post.comment_count,
                    "engagement_rate": engagement_rate,
                    "published": post.published,
                    "created_at": post.created_at,
                }
            )

        top_posts = sorted(
            post_performance,
            key=lambda post: (post["total_engagements"], post["total_views"]),
            reverse=True,
        )[:10]
        avg_engagement_rate = round(
            sum(post["engagement_rate"] for post in post_performance) / len(post_performance),
            1,
        ) if post_performance else 0.0

        reach_series = []
        for offset in range(6, -1, -1):
            day_start = current_day_start - timedelta(days=offset)
            day_end = day_start + timedelta(days=1)
            reach_series.append(
                {
                    "label": day_start.strftime("%a"),
                    "views": await self._count_views_in_range(db, post_ids, day_start, day_end),
                    "unique_visitors": await self._count_distinct_visitors(db, post_ids, day_start, day_end),
                }
            )

        return {
            "total_views": total_views,
            "unique_visitors": unique_visitors,
            "total_engagements": total_engagements,
            "total_posts": len(user_posts),
            "views_this_week": views_this_week,
            "views_last_week": views_last_week,
            "growth_percent": self._growth_percent(views_this_week, views_last_week),
            "reach_this_week": reach_this_week,
            "reach_last_week": reach_last_week,
            "reach_growth_percent": self._growth_percent(reach_this_week, reach_last_week),
            "followers": {
                "total_followers": total_followers,
                "gained_this_week": followers_gained_this_week,
                "gained_last_week": followers_gained_last_week,
                "growth_percent": follower_growth,
            },
            "avg_engagement_rate": avg_engagement_rate,
            "post_performance": post_performance,
            "reach_series": reach_series,
            "top_posts": top_posts,
        }

    async def _count_views_in_range(
        self,
        db: AsyncSession,
        post_ids: list[int],
        start: datetime,
        end: datetime | None,
    ) -> int:
        stmt = select(func.count(PageView.id)).where(PageView.post_id.in_(post_ids), PageView.created_at >= start)
        if end is not None:
            stmt = stmt.where(PageView.created_at < end)
        return (await db.execute(stmt)).scalar() or 0

    async def _count_distinct_visitors(
        self,
        db: AsyncSession,
        post_ids: list[int],
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> int:
        stmt = select(func.count(func.distinct(PageView.ip_hash))).where(PageView.post_id.in_(post_ids))
        if start is not None:
            stmt = stmt.where(PageView.created_at >= start)
        if end is not None:
            stmt = stmt.where(PageView.created_at < end)
        return (await db.execute(stmt)).scalar() or 0

    def _growth_percent(self, current: int, previous: int) -> float:
        if previous > 0:
            return round(((current - previous) / previous) * 100, 1)
        if current > 0:
            return 100.0
        return 0.0


analytics_service = AnalyticsService()
