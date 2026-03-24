from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_routes import router as admin_router
from app.api.analytics_routes import router as analytics_router
from app.api.moderation_routes import router as moderation_router
from app.api.post_routes import router as post_router
from app.api.profile_routes import router as profile_router
from app.api.user_routes import router as user_router
from app.core.config import get_settings
from app.db.database import Base, engine
import app.models.analytics
import app.models.image
import app.models.moderation_log
import app.models.user_profile
from app.ml.content_moderator import moderator

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Initialize ML content moderator
    moderator.load_or_train()
    yield
    # Cleanup on shutdown
    await engine.dispose()


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


@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME}", "docs": "/docs"}
