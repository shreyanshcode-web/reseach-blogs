"""
Post service – business logic for blog posts.
Integrates ML content moderation into create/update flows.
"""

from datetime import datetime, timezone
import re
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.content_moderator import moderator
from app.models.post import Post
from app.models.moderation_log import ModerationLog
from app.models.user import User
from app.repositories.post_repository import post_repository
from app.repositories.user_repository import user_repository
from app.schemas.post_schema import PostCreate, PostUpdate

def extract_text_from_blocks(content) -> str:
    """Recursively extract plain text from Notion-style JSON blocks."""
    if isinstance(content, str):
        return content
        
    extracted = []
    
    if isinstance(content, dict):
        if content.get("type") == "text" and "text" in content:
            extracted.append(content["text"])
        for val in content.values():
            extracted.append(extract_text_from_blocks(val))
    elif isinstance(content, list):
        for item in content:
            extracted.append(extract_text_from_blocks(item))
            
    return " ".join([text for text in extracted if text.strip()])


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:200] or "post"


async def _unique_slug(db: AsyncSession, title: str, exclude_post_id: int | None = None) -> str:
    base = _slugify(title)
    slug = base
    suffix = 2
    while await post_repository.slug_exists(db, slug, exclude_post_id=exclude_post_id):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def _clean_tags(tags: list[str] | None) -> list[str]:
    cleaned = []
    for tag in tags or []:
        candidate = tag.strip().lower()
        if candidate and candidate not in cleaned:
            cleaned.append(candidate[:50])
    return cleaned[:20]


class PostService:

    async def create_post(
        self, db: AsyncSession, data: PostCreate, author_id: int
    ) -> Post:
        # Run content moderation
        extracted_content = extract_text_from_blocks(data.content)
        result = moderator.moderate(title=data.title, content=extracted_content)

        if result.flagged_keywords:
            log_entry = ModerationLog(
                original_text=extracted_content,
                flagged_keywords=result.flagged_keywords
            )
            db.add(log_entry)
            await db.flush()

        if result.status in ("rejected", "flagged"):
            author = await user_repository.get_by_id(db, author_id)
            if author and getattr(author, 'is_verified', False):
                result.status = "explicit"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Content rejected: Explicit words or false claims detected.",
                        "flagged_keywords": result.flagged_keywords,
                        "suggestions": result.suggestions,
                    },
                )

        post = Post(
            title=data.title,
            slug=await _unique_slug(db, data.title),
            content=data.content,
            tags=_clean_tags(data.tags),
            published=data.published if result.status == "approved" else False,
            author_id=author_id,
            moderation_status=result.status,
            moderation_score=result.confidence,
        )
        post = await post_repository.create(db, post)
        
        # Ensure post object in memory has aware datetimes for immediate downstream usage (like events)
        if post.created_at and post.created_at.tzinfo is None:
            post.created_at = post.created_at.replace(tzinfo=timezone.utc)
        if post.updated_at and post.updated_at.tzinfo is None:
            post.updated_at = post.updated_at.replace(tzinfo=timezone.utc)
            
        return post

    async def get_post(
        self,
        db: AsyncSession,
        post_id: int,
        current_user: User | None = None,
    ) -> Post:
        post = await post_repository.get_by_id(db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )

        is_owner = current_user is not None and post.author_id == current_user.id
        is_admin = bool(current_user and current_user.is_admin)
        can_view_hidden = is_owner or is_admin

        if post.is_suspended and not can_view_hidden:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )
        if not post.published and not can_view_hidden:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )
        if post.moderation_status == "explicit" and not can_view_hidden:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )
        return post

    async def get_all_posts(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        current_user: User | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        return await post_repository.get_all(
            db,
            skip=skip,
            limit=limit,
            current_user_id=current_user.id if current_user else None,
            sort=sort,
        )

    async def get_posts_by_author(
        self,
        db: AsyncSession,
        author_id: int,
        skip: int = 0,
        limit: int = 100,
        current_user: User | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        return await post_repository.get_by_author(
            db,
            author_id,
            skip=skip,
            limit=limit,
            current_user_id=current_user.id if current_user else None,
            sort=sort,
        )

    async def get_posts_by_author_username(
        self,
        db: AsyncSession,
        username: str,
        skip: int = 0,
        limit: int = 100,
        current_user: User | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        author = await user_repository.get_by_username(db, username)
        if not author:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Author not found"
            )
        return await self.get_posts_by_author(
            db,
            author.id,
            skip=skip,
            limit=limit,
            current_user=current_user,
            sort=sort,
        )

    async def search_posts(
        self,
        db: AsyncSession,
        query: str,
        skip: int = 0,
        limit: int = 100,
        current_user: User | None = None,
        sort: str = "newest",
    ) -> Sequence[Post]:
        if not query.strip():
            return await self.get_all_posts(
                db,
                skip=skip,
                limit=limit,
                current_user=current_user,
                sort=sort,
            )
        return await post_repository.search(
            db,
            query=query,
            skip=skip,
            limit=limit,
            current_user_id=current_user.id if current_user else None,
            sort=sort,
        )

    async def update_post(
        self, db: AsyncSession, post_id: int, data: PostUpdate, current_user_id: int
    ) -> Post:
        post = await self.get_post(db, post_id, current_user=await user_repository.get_by_id(db, current_user_id))
        if post.author_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this post",
            )

        update_data = data.model_dump(exclude_unset=True)

        # Re-run moderation if title or content changed
        new_title = update_data.get("title", post.title)
        new_content = update_data.get("content", post.content)

        if "title" in update_data or "content" in update_data:
            extracted_new_content = extract_text_from_blocks(new_content)
            result = moderator.moderate(title=new_title, content=extracted_new_content)

            if result.flagged_keywords:
                log_entry_update = ModerationLog(
                    original_text=extracted_new_content,
                    flagged_keywords=result.flagged_keywords
                )
                db.add(log_entry_update)
                await db.flush()

            if result.status in ("rejected", "flagged"):
                author = await user_repository.get_by_id(db, current_user_id)
                if author and getattr(author, 'is_verified', False):
                    result.status = "explicit"
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Update rejected: Explicit words or false claims detected.",
                            "flagged_keywords": result.flagged_keywords,
                            "suggestions": result.suggestions,
                        },
                    )

            update_data["moderation_status"] = result.status
            update_data["moderation_score"] = result.confidence
            if result.status == "flagged":
                update_data["published"] = False

        if "title" in update_data:
            update_data["slug"] = await _unique_slug(db, update_data["title"], exclude_post_id=post.id)
        if "tags" in update_data:
            update_data["tags"] = _clean_tags(update_data["tags"])

        post = await post_repository.update(db, post, **update_data)
        
        # Ensure post object in memory has aware datetimes
        if post.created_at and post.created_at.tzinfo is None:
            post.created_at = post.created_at.replace(tzinfo=timezone.utc)
        if post.updated_at and post.updated_at.tzinfo is None:
            post.updated_at = post.updated_at.replace(tzinfo=timezone.utc)
            
        return post

    async def delete_post(
        self, db: AsyncSession, post_id: int, current_user_id: int
    ) -> None:
        post = await self.get_post(db, post_id, current_user=await user_repository.get_by_id(db, current_user_id))
        if post.author_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this post",
            )
        await post_repository.delete(db, post)


post_service = PostService()
