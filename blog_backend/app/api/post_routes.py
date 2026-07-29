from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.post_schema import PostCreate, PostResponse, PostUpdate
from app.services.timeline_events import timeline_event_bus
from app.services.post_service import post_service

router = APIRouter(prefix="/api/posts", tags=["Posts"])


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new blog post (authenticated)."""
    post = await post_service.create_post(db, data, author_id=current_user.id)
    await db.commit()
    await timeline_event_bus.publish(
        "post.created",
        {
            "post_id": post.id,
            "author_id": current_user.id,
            "published": post.published,
        },
    )
    return post


@router.get("/", response_model=List[PostResponse])
async def list_posts(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query("", description="Search title, content, author, and tags"),
    sort: str = Query("newest", pattern="^(newest|oldest|most_viewed|alphabetical)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """List posts with pagination, search, and sorting."""
    return await post_service.search_posts(
        db,
        query=search,
        skip=(page - 1) * limit,
        limit=limit,
        current_user=current_user,
        sort=sort,
    )


@router.get("/search", response_model=List[PostResponse])
async def search_posts(
    q: str = Query("", alias="q"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("newest", pattern="^(newest|oldest|most_viewed|alphabetical)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Search posts by title, author username, or serialized content."""
    return await post_service.search_posts(
        db,
        query=q,
        skip=(page - 1) * limit,
        limit=limit,
        current_user=current_user,
        sort=sort,
    )


@router.get("/author/{username}", response_model=List[PostResponse])
async def list_posts_by_author(
    username: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("newest", pattern="^(newest|oldest|most_viewed|alphabetical)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """List posts for a specific author username."""
    return await post_service.get_posts_by_author_username(
        db,
        username=username,
        skip=(page - 1) * limit,
        limit=limit,
        current_user=current_user,
        sort=sort,
    )


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Get a post by ID."""
    return await post_service.get_post(db, post_id, current_user=current_user)


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a post (only the author can update)."""
    post = await post_service.update_post(db, post_id, data, current_user_id=current_user.id)
    await db.commit()
    await timeline_event_bus.publish(
        "post.updated",
        {
            "post_id": post.id,
            "author_id": current_user.id,
            "published": post.published,
        },
    )
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a post (only the author can delete)."""
    post = await post_service.get_post(db, post_id, current_user=current_user)
    await post_service.delete_post(db, post_id, current_user_id=current_user.id)
    await db.commit()
    await timeline_event_bus.publish(
        "post.deleted",
        {
            "post_id": post_id,
            "author_id": post.author_id,
        },
    )
