from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user_optional
from app.models.user import User
from app.schemas.timeline_schema import HomeTimelineResponse
from app.services.timeline_service import timeline_service


router = APIRouter(prefix="/api/timeline", tags=["Timeline"])


@router.get("/home", response_model=HomeTimelineResponse)
async def get_home_timeline(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    posts, source, cached, delivery_model = await timeline_service.get_home_timeline(
        db,
        current_user=current_user,
        limit=max(1, min(limit, 50)),
    )
    return HomeTimelineResponse(
        posts=posts,
        source=source,
        personalized=current_user is not None,
        cached=cached,
        delivery_model=delivery_model,
        generated_at=datetime.now(timezone.utc),
    )
