from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import math

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.models.analytics import Engagement
from app.models.follow import Follow
from app.models.post import Post
from app.models.user import User
from app.services.follow_service import follow_service

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover - optional dependency during local editing
    Redis = None


settings = get_settings()


class TimelineService:
    def __init__(self) -> None:
        self.redis: Redis | None = None
        self.user_cache_registry_key = "timeline:home:users"

    def attach_redis(self, redis_client: Redis | None) -> None:
        self.redis = redis_client

    async def get_home_timeline(
        self,
        db: AsyncSession,
        current_user: User | None,
        limit: int = 20,
    ) -> tuple[list[Post], str, bool, str]:
        if current_user is None:
            cache_key = self._global_key()
            cached_ids = await self._get_cached_ids(cache_key, limit)
            if cached_ids:
                posts = await self._hydrate_posts(db, cached_ids)
                if posts:
                    return posts, "global-cache", True, "fan-out-read"

            posts = await self._build_global_timeline(db, limit)
            await self._cache_posts(cache_key, posts, None)
            return posts, "global-fresh", False, "fan-out-read"

        cache_key = self._user_key(current_user.id)
        cached_ids = await self._get_cached_ids(cache_key, limit * 2)
        followed_ids = await follow_service.get_followed_user_ids(db, current_user.id)
        delivery_model = await self._describe_delivery_model(db, followed_ids)

        candidate_ids = list(cached_ids)
        celebrity_post_ids = await self._get_celebrity_post_ids(db, followed_ids, limit)
        candidate_ids.extend(celebrity_post_ids)

        if not candidate_ids:
            await self.rebuild_user_timeline(db, current_user.id)
            cached_ids = await self._get_cached_ids(cache_key, limit * 2)
            candidate_ids = list(cached_ids)
            candidate_ids.extend(await self._get_celebrity_post_ids(db, followed_ids, limit))

        unique_ids: list[int] = []
        seen: set[int] = set()
        for post_id in candidate_ids:
            if post_id in seen:
                continue
            seen.add(post_id)
            unique_ids.append(post_id)

        if unique_ids:
            posts = await self._hydrate_posts(db, unique_ids)
            if posts:
                ranked = await self._rank_posts_for_user(db, current_user.id, posts)
                return ranked[:limit], "user-timeline", bool(cached_ids), delivery_model

        fallback_posts = await self._build_global_timeline(db, limit)
        return fallback_posts, "global-fallback", False, "fan-out-read"

    async def rebuild_user_timeline(self, db: AsyncSession, user_id: int) -> None:
        followed_ids = await follow_service.get_followed_user_ids(db, user_id)
        if not followed_ids:
            posts = await self._build_global_timeline(db, limit=60)
            await self._cache_posts(self._user_key(user_id), posts, user_id)
            return

        normal_author_ids, celebrity_author_ids = await self._split_authors_by_followers(db, followed_ids)
        posts: list[Post] = []
        if normal_author_ids:
            posts = await self._load_recent_posts_for_authors(db, normal_author_ids, limit=100)
        if celebrity_author_ids and len(posts) < 60:
            celebrity_posts = await self._load_recent_posts_for_authors(db, celebrity_author_ids, limit=60)
            posts.extend(celebrity_posts)
        ranked = await self._rank_posts_for_user(db, user_id, posts)
        await self._cache_posts(self._user_key(user_id), ranked[:100], user_id)

    async def handle_post_change(
        self,
        db: AsyncSession,
        post_id: int,
        author_id: int | None = None,
    ) -> None:
        post = await db.get(Post, post_id)
        await self.warm_global_timeline(db)
        if post is None or not post.published or post.is_suspended or post.moderation_status == "explicit":
            if author_id is not None:
                await self._remove_post_from_all_timelines(author_id, post_id)
            return

        if author_id is None:
            author_id = post.author_id
        followers = await follow_service.get_follower_user_ids(db, author_id)
        follower_count = len(followers)
        if follower_count >= settings.TIMELINE_CELEBRITY_THRESHOLD:
            await self._invalidate_users(followers)
            return

        await self._fanout_post_to_followers(followers, post)

    async def handle_post_delete(
        self,
        db: AsyncSession,
        post_id: int,
        author_id: int | None = None,
    ) -> None:
        await self.warm_global_timeline(db)
        if author_id is not None:
            await self._remove_post_from_all_timelines(author_id, post_id)

    async def handle_engagement_change(
        self,
        db: AsyncSession,
        post_id: int,
        user_id: int | None = None,
    ) -> None:
        await self.warm_global_timeline(db)
        post = await db.get(Post, post_id)
        if post is not None:
            followers = await follow_service.get_follower_user_ids(db, post.author_id)
            if len(followers) < settings.TIMELINE_CELEBRITY_THRESHOLD:
                await self._fanout_post_to_followers(followers, post)
        if user_id is not None:
            await self.rebuild_user_timeline(db, user_id)

    async def handle_follow_change(self, db: AsyncSession, follower_id: int, followed_id: int) -> None:
        await self.rebuild_user_timeline(db, follower_id)

    async def warm_global_timeline(self, db: AsyncSession) -> None:
        posts = await self._build_global_timeline(db, limit=100)
        await self._cache_posts(self._global_key(), posts, None)

    async def _build_global_timeline(self, db: AsyncSession, limit: int) -> list[Post]:
        candidates = await self._load_candidates(db, max(limit * 4, 40))
        ranked = sorted(candidates, key=lambda post: self._global_score(post), reverse=True)
        return ranked[:limit]

    async def _load_candidates(self, db: AsyncSession, limit: int) -> list[Post]:
        result = await db.execute(
            select(Post)
            .options(joinedload(Post.author))
            .where(
                and_(
                    Post.published.is_(True),
                    Post.is_suspended.is_(False),
                    Post.moderation_status != "explicit",
                )
            )
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().unique().all())

    async def _load_recent_posts_for_authors(
        self,
        db: AsyncSession,
        author_ids: list[int],
        limit: int,
    ) -> list[Post]:
        if not author_ids:
            return []
        result = await db.execute(
            select(Post)
            .options(joinedload(Post.author))
            .where(
                and_(
                    Post.author_id.in_(author_ids),
                    Post.published.is_(True),
                    Post.is_suspended.is_(False),
                    Post.moderation_status != "explicit",
                )
            )
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().unique().all())

    async def _split_authors_by_followers(self, db: AsyncSession, author_ids: list[int]) -> tuple[list[int], list[int]]:
        normal: list[int] = []
        celebrity: list[int] = []
        for author_id in author_ids:
            followers = await follow_service.get_follower_user_ids(db, author_id)
            if len(followers) >= settings.TIMELINE_CELEBRITY_THRESHOLD:
                celebrity.append(author_id)
            else:
                normal.append(author_id)
        return normal, celebrity

    async def _get_celebrity_post_ids(self, db: AsyncSession, followed_ids: list[int], limit: int) -> list[int]:
        if not followed_ids:
            return []
        _normal, celebrity = await self._split_authors_by_followers(db, followed_ids)
        if not celebrity:
            return []
        posts = await self._load_recent_posts_for_authors(db, celebrity, limit=max(limit * 3, 20))
        return [post.id for post in posts]

    async def _describe_delivery_model(self, db: AsyncSession, followed_ids: list[int]) -> str:
        if not followed_ids:
            return "fan-out-read"
        normal, celebrity = await self._split_authors_by_followers(db, followed_ids)
        if normal and celebrity:
            return "hybrid"
        if normal:
            return "fan-out-write"
        return "fan-out-read"

    async def _rank_posts_for_user(self, db: AsyncSession, user_id: int, posts: list[Post]) -> list[Post]:
        affinity = await self._load_user_affinity(db, user_id)
        unique_posts: dict[int, Post] = {post.id: post for post in posts}
        ranked = sorted(
            unique_posts.values(),
            key=lambda post: self._personalized_score(post, user_id, affinity),
            reverse=True,
        )
        return ranked

    async def _load_user_affinity(self, db: AsyncSession, user_id: int) -> dict[str, Counter]:
        author_weights: Counter = Counter()
        category_weights: Counter = Counter()
        tag_weights: Counter = Counter()

        authored = await db.execute(
            select(Post).where(Post.author_id == user_id).order_by(Post.created_at.desc()).limit(20)
        )
        for post in authored.scalars().all():
            self._accumulate_post_affinity(post, author_weights, category_weights, tag_weights, 2.0)

        engaged = await db.execute(
            select(Post, Engagement.type)
            .join(Engagement, Engagement.post_id == Post.id)
            .where(
                and_(
                    Engagement.user_id == user_id,
                    Post.published.is_(True),
                    Post.is_suspended.is_(False),
                )
            )
            .order_by(Engagement.created_at.desc())
            .limit(50)
        )
        type_weights = {"like": 2.5, "share": 3.0, "bookmark": 2.8, "comment": 2.2}
        for post, engagement_type in engaged.all():
            self._accumulate_post_affinity(
                post,
                author_weights,
                category_weights,
                tag_weights,
                type_weights.get(engagement_type, 1.5),
            )

        return {"authors": author_weights, "categories": category_weights, "tags": tag_weights}

    def _accumulate_post_affinity(
        self,
        post: Post,
        author_weights: Counter,
        category_weights: Counter,
        tag_weights: Counter,
        weight: float,
    ) -> None:
        metadata = self._post_metadata(post)
        author_weights[post.author_id] += weight
        if metadata["category"]:
            category_weights[metadata["category"]] += weight
        for tag in metadata["tags"]:
            tag_weights[tag] += weight

    def _personalized_score(self, post: Post, user_id: int, affinity: dict[str, Counter]) -> float:
        base_score = self._global_score(post)
        metadata = self._post_metadata(post)
        affinity_boost = affinity["authors"].get(post.author_id, 0.0) * 4.0
        if metadata["category"]:
            affinity_boost += affinity["categories"].get(metadata["category"], 0.0) * 2.5
        affinity_boost += sum(affinity["tags"].get(tag, 0.0) * 1.2 for tag in metadata["tags"])
        if post.author_id == user_id:
            affinity_boost -= 8.0
        return base_score + affinity_boost

    def _global_score(self, post: Post) -> float:
        hours_since_publish = max((datetime.now(timezone.utc) - post.created_at).total_seconds() / 3600, 1.0)
        recency_score = max(0.0, 72 - hours_since_publish) * 1.5
        engagement_score = (
            (post.like_count * 4.0)
            + (post.share_count * 6.0)
            + (post.bookmark_count * 5.0)
            + (post.comment_count * 4.0)
            + (post.view_count * 0.15)
        )
        freshness_bonus = 8.0 / math.sqrt(hours_since_publish)
        return engagement_score + recency_score + freshness_bonus

    def _post_metadata(self, post: Post) -> dict[str, str | list[str]]:
        content = post.content if isinstance(post.content, dict) else {}
        metadata = content.get("metadata", {}) if isinstance(content, dict) else {}
        category = metadata.get("category") or "Story"
        raw_tags = metadata.get("tags") if isinstance(metadata.get("tags"), list) else []
        tags = [str(tag).strip().lower() for tag in raw_tags if str(tag).strip()]
        return {"category": str(category).strip().lower(), "tags": tags}

    async def _hydrate_posts(self, db: AsyncSession, ids: list[int]) -> list[Post]:
        if not ids:
            return []
        result = await db.execute(
            select(Post)
            .options(joinedload(Post.author))
            .where(
                and_(
                    Post.id.in_(ids),
                    Post.published.is_(True),
                    Post.is_suspended.is_(False),
                    Post.moderation_status != "explicit",
                )
            )
        )
        posts = {post.id: post for post in result.scalars().unique().all()}
        return [posts[post_id] for post_id in ids if post_id in posts]

    async def _fanout_post_to_followers(self, follower_ids: list[int], post: Post) -> None:
        if not self.redis or not settings.TIMELINE_CACHE_ENABLED or not follower_ids:
            return
        for follower_id in follower_ids:
            await self.redis.zadd(self._user_key(follower_id), {str(post.id): self._timeline_score(post)})
            await self.redis.expire(self._user_key(follower_id), settings.REDIS_TIMELINE_TTL_SECONDS)
            await self.redis.sadd(self.user_cache_registry_key, str(follower_id))

    async def _remove_post_from_all_timelines(self, author_id: int, post_id: int) -> None:
        if not self.redis or not settings.TIMELINE_CACHE_ENABLED:
            return
        followers = await self.redis.smembers(self.user_cache_registry_key)
        keys = [self._user_key(int(user_id)) for user_id in followers if str(user_id).isdigit()]
        for key in keys:
            await self.redis.zrem(key, str(post_id))

    async def _invalidate_users(self, user_ids: list[int]) -> None:
        if not self.redis or not settings.TIMELINE_CACHE_ENABLED or not user_ids:
            return
        await self.redis.delete(*[self._user_key(user_id) for user_id in user_ids])

    async def _get_cached_ids(self, cache_key: str, limit: int) -> list[int]:
        if not self.redis or not settings.TIMELINE_CACHE_ENABLED:
            return []
        members = await self.redis.zrevrange(cache_key, 0, max(limit - 1, 0))
        ids: list[int] = []
        for member in members:
            try:
                ids.append(int(member))
            except (TypeError, ValueError):
                continue
        return ids

    async def _cache_posts(self, cache_key: str, posts: list[Post], user_id: int | None) -> None:
        if not self.redis or not settings.TIMELINE_CACHE_ENABLED:
            return
        pipeline = self.redis.pipeline()
        pipeline.delete(cache_key)
        if posts:
            pipeline.zadd(cache_key, {str(post.id): self._timeline_score(post) for post in posts})
        pipeline.expire(cache_key, settings.REDIS_TIMELINE_TTL_SECONDS)
        if user_id is not None:
            pipeline.sadd(self.user_cache_registry_key, str(user_id))
        await pipeline.execute()

    def _timeline_score(self, post: Post) -> float:
        return self._global_score(post) + float(int(post.created_at.timestamp()))

    def _global_key(self) -> str:
        return "timeline:home:global:v2"

    def _user_key(self, user_id: int) -> str:
        return f"timeline:home:user:{user_id}:v2"


timeline_service = TimelineService()
