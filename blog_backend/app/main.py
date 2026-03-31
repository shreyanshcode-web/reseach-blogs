from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_routes import router as admin_router
from app.api.analytics_routes import router as analytics_router
from app.api.follow_routes import router as follow_router
from app.api.ml_training_routes import router as ml_router
from app.api.moderation_routes import router as moderation_router
from app.api.post_routes import router as post_router
from app.api.profile_routes import router as profile_router
from app.api.timeline_routes import router as timeline_router
from app.api.user_routes import router as user_router
from app.api.websocket_routes import router as websocket_router
from app.core.config import get_settings
from app.db.database import Base, engine, run_startup_migrations
from app.db.ml_database import init_ml_db, dispose_ml_db
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all main DB tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await run_startup_migrations()
    ensure_media_dirs()
    # Create separate ML training DB tables
    await init_ml_db()
    # Initialize ML content moderator
    moderator.load_or_train()
    await timeline_event_bus.start()
    from app.db.database import async_session
    async with async_session() as session:
        await timeline_service.warm_global_timeline(session)
        await session.commit()
    yield
    # Cleanup on shutdown
    await timeline_event_bus.stop()
    await engine.dispose()
    await dispose_ml_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="A blog API built with FastAPI and clean architecture",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_router)
app.include_router(post_router)
app.include_router(moderation_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(profile_router)
app.include_router(ml_router)
app.include_router(timeline_router)
app.include_router(follow_router)
app.include_router(websocket_router)


@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME}", "docs": "/docs"}
