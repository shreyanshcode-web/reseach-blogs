"""
Post service – business logic for blog posts.
Integrates ML content moderation into create/update flows.
"""

from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.content_moderator import moderator
from app.models.post import Post
from app.models.moderation_log import ModerationLog
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
            await db.commit()  # Force commit so the log persists despite the incoming exception

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
            content=data.content,
            published=data.published if result.status == "approved" else False,
            author_id=author_id,
            moderation_status=result.status,
            moderation_score=result.confidence,
        )
        return await post_repository.create(db, post)

    async def get_post(self, db: AsyncSession, post_id: int, is_authenticated: bool = False) -> Post:
        post = await post_repository.get_by_id(db, post_id)
        if not post or (not is_authenticated and post.moderation_status == "explicit"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )
        return post

    async def get_all_posts(
        self, db: AsyncSession, skip: int = 0, limit: int = 100, is_authenticated: bool = False
    ) -> Sequence[Post]:
        return await post_repository.get_all(db, skip=skip, limit=limit, is_authenticated=is_authenticated)

    async def get_posts_by_author(
        self, db: AsyncSession, author_id: int, skip: int = 0, limit: int = 100, is_authenticated: bool = False
    ) -> Sequence[Post]:
        return await post_repository.get_by_author(db, author_id, skip=skip, limit=limit, is_authenticated=is_authenticated)

    async def update_post(
        self, db: AsyncSession, post_id: int, data: PostUpdate, current_user_id: int
    ) -> Post:
        post = await self.get_post(db, post_id)
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
                await db.commit()

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

        return await post_repository.update(db, post, **update_data)

    async def delete_post(
        self, db: AsyncSession, post_id: int, current_user_id: int
    ) -> None:
        post = await self.get_post(db, post_id)
        if post.author_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this post",
            )
        await post_repository.delete(db, post)


post_service = PostService()
