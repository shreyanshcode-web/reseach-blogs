from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import Base, engine, run_startup_migrations
from app.db.ml_database import dispose_ml_db, init_ml_db
import app.models.analytics
import app.models.follow
import app.models.image
import app.models.moderation_log
import app.models.post
import app.models.user_profile
import app.models.weekly_top
from app.ml.content_moderator import moderator
from app.services.media_storage import ensure_media_dirs
from app.services.timeline_events import timeline_event_bus
from app.services.timeline_service import timeline_service

settings = get_settings()


def create_app(
    *,
    title_suffix: str,
    routers: list,
    init_ml: bool = False,
    init_timeline: bool = False,
    init_media: bool = False,
):
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await run_startup_migrations()

        if init_media:
            ensure_media_dirs()

        if init_ml:
            await init_ml_db()
            moderator.load_or_train()

        if init_timeline:
            await timeline_event_bus.start()
            from app.db.database import async_session
            async with async_session() as session:
                await timeline_service.warm_global_timeline(session)
                await session.commit()

        yield

        if init_timeline:
            await timeline_event_bus.stop()

        await engine.dispose()

        if init_ml:
            await dispose_ml_db()

    app = FastAPI(
        title=f"{settings.APP_NAME} - {title_suffix}",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in routers:
        app.include_router(router)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "service": title_suffix.lower().replace(" ", "-"),
            "message": f"Welcome to {settings.APP_NAME} - {title_suffix}",
            "docs": "/docs",
        }

    return app
