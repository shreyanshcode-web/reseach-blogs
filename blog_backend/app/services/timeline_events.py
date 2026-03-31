from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings
from app.db.database import async_session
from app.services.live_timeline import timeline_connection_manager
from app.services.timeline_service import timeline_service

try:
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
except Exception:  # pragma: no cover - optional dependency during local editing
    AIOKafkaConsumer = None
    AIOKafkaProducer = None

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover - optional dependency during local editing
    Redis = None


logger = logging.getLogger(__name__)
settings = get_settings()


class TimelineEventBus:
    def __init__(self) -> None:
        self.redis: Redis | None = None
        self.producer: AIOKafkaProducer | None = None
        self.consumer: AIOKafkaConsumer | None = None
        self.consumer_task: asyncio.Task | None = None

    async def start(self) -> None:
        await self._start_redis()
        await self._start_kafka()

    async def stop(self) -> None:
        if self.consumer_task:
            self.consumer_task.cancel()
            try:
                await self.consumer_task
            except asyncio.CancelledError:
                pass
            self.consumer_task = None

        if self.consumer is not None:
            await self.consumer.stop()
            self.consumer = None

        if self.producer is not None:
            await self.producer.stop()
            self.producer = None

        if self.redis is not None:
            await self.redis.aclose()
            self.redis = None

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        event = {
            "type": event_type,
            "payload": payload,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.producer is None or not settings.TIMELINE_EVENTS_ENABLED:
            await self._dispatch_event(event)
            return

        try:
            await self.producer.send_and_wait(
                settings.KAFKA_TIMELINE_TOPIC,
                json.dumps(event).encode("utf-8"),
            )
        except Exception:
            logger.exception("Kafka publish failed, falling back to direct timeline refresh")
            await self._dispatch_event(event)

    async def _start_redis(self) -> None:
        if not settings.TIMELINE_CACHE_ENABLED or Redis is None:
            timeline_service.attach_redis(None)
            return

        try:
            redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
            await redis_client.ping()
            self.redis = redis_client
            timeline_service.attach_redis(redis_client)
        except Exception:
            logger.exception("Redis unavailable, timeline cache disabled")
            self.redis = None
            timeline_service.attach_redis(None)

    async def _start_kafka(self) -> None:
        if not settings.TIMELINE_EVENTS_ENABLED or AIOKafkaProducer is None or AIOKafkaConsumer is None:
            return

        try:
            self.producer = AIOKafkaProducer(bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)
            await self.producer.start()

            self.consumer = AIOKafkaConsumer(
                settings.KAFKA_TIMELINE_TOPIC,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id=settings.KAFKA_GROUP_ID,
                auto_offset_reset="latest",
                enable_auto_commit=True,
            )
            await self.consumer.start()
            self.consumer_task = asyncio.create_task(self._consume_loop())
        except Exception:
            logger.exception("Kafka unavailable, event bus will use direct dispatch")
            if self.consumer is not None:
                await self.consumer.stop()
                self.consumer = None
            if self.producer is not None:
                await self.producer.stop()
                self.producer = None

    async def _consume_loop(self) -> None:
        if self.consumer is None:
            return

        try:
            async for message in self.consumer:
                try:
                    event = json.loads(message.value.decode("utf-8"))
                    await self._dispatch_event(event)
                except Exception:
                    logger.exception("Timeline consumer failed to process event")
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Timeline consumer stopped unexpectedly")

    async def _dispatch_event(self, event: dict[str, Any]) -> None:
        event_type = event.get("type")
        payload = event.get("payload", {})

        async with async_session() as db:
            if event_type in {"post.created", "post.updated"}:
                await timeline_service.handle_post_change(
                    db,
                    post_id=int(payload["post_id"]),
                    author_id=payload.get("author_id"),
                )
            elif event_type == "post.deleted":
                await timeline_service.handle_post_delete(
                    db,
                    post_id=int(payload["post_id"]),
                    author_id=payload.get("author_id"),
                )
            elif event_type == "engagement.recorded":
                await timeline_service.handle_engagement_change(
                    db,
                    post_id=int(payload["post_id"]),
                    user_id=payload.get("user_id"),
                )
                await timeline_connection_manager.broadcast_refresh(event_type, [payload.get("user_id")] if payload.get("user_id") else None)
            elif event_type in {"follow.created", "follow.deleted"}:
                await timeline_service.handle_follow_change(
                    db,
                    follower_id=int(payload["follower_id"]),
                    followed_id=int(payload["followed_id"]),
                )
                await timeline_connection_manager.broadcast_refresh(event_type, [int(payload["follower_id"])])
            else:
                return
            if event_type in {"post.created", "post.updated", "post.deleted"}:
                author_id = payload.get("author_id")
                await timeline_connection_manager.broadcast_refresh(event_type, [author_id] if author_id else None)
            await db.commit()


timeline_event_bus = TimelineEventBus()
