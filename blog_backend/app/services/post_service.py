"""
Post service – business logic for blog posts.
Integrates ML content moderation into create/update flows.
"""

from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.content_moderator import moderator
from app.models.post import Post
from app.repositories.post_repository import post_repository
from app.schemas.post_schema import PostCreate, PostUpdate


class PostService:

    async def create_post(
        self, db: AsyncSession, data: PostCreate, author_id: int
    ) -> Post:
        # Run content moderation
        result = moderator.moderate(title=data.title, content=data.content)

        if result.status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Your post was rejected by content moderation.",
                    "reason": result.reason,
                    "label": result.label,
                    "confidence": result.confidence,
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

    async def get_post(self, db: AsyncSession, post_id: int) -> Post:
        post = await post_repository.get_by_id(db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )
        return post

    async def get_all_posts(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> Sequence[Post]:
        return await post_repository.get_all(db, skip=skip, limit=limit)

    async def get_posts_by_author(
        self, db: AsyncSession, author_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Post]:
        return await post_repository.get_by_author(db, author_id, skip=skip, limit=limit)

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
            result = moderator.moderate(title=new_title, content=new_content)

            if result.status == "rejected":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Your updated post was rejected by content moderation.",
                        "reason": result.reason,
                        "label": result.label,
                        "confidence": result.confidence,
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
