"""
Moderation API routes: preview checks, flagged post review, and media moderation.
"""

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from PIL import Image as PILImage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.ml.content_moderator import moderator
from app.ml.deepai_moderator import check_nsfw, decide, update_strikes
from app.models.image import Image
from app.models.post import Post
from app.models.user import User
from app.schemas.image_schema import DeepAIUploadResponse, ImageResponse
from app.schemas.post_schema import (
    ModerationCheckRequest,
    ModerationCheckResponse,
    PostResponse,
)
from app.services.media_storage import save_media_file

router = APIRouter(prefix="/api/moderation", tags=["Moderation"])


def _get_image_dimensions(image_bytes: bytes) -> tuple[int | None, int | None]:
    try:
        with PILImage.open(BytesIO(image_bytes)) as image:
            return image.width, image.height
    except Exception:
        return None, None


def _load_image_bytes(path: str | None) -> bytes:
    if not path:
        raise HTTPException(status_code=404, detail="Image file not found")
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    return file_path.read_bytes()


def _image_response(image: Image) -> ImageResponse:
    return ImageResponse(
        id=image.id,
        is_explicit=image.is_explicit,
        moderation_score=image.moderation_score,
        status=image.status,
        created_at=image.created_at,
        author_id=image.author_id,
        view_url=f"/api/moderation/image/{image.id}",
        mime_type=image.mime_type,
        file_size=image.file_size,
        width=image.width,
        height=image.height,
    )


@router.post("/check", response_model=ModerationCheckResponse)
async def check_content(data: ModerationCheckRequest):
    result = moderator.check_text(data.text)
    return ModerationCheckResponse(
        label=result.label,
        confidence=result.confidence,
        status=result.status,
        reason=result.reason,
    )


@router.post("/image", response_model=ImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    try:
        from app.ml.image_moderator import image_moderator

        blurred_bytes, is_nsfw, confidence = image_moderator.process_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    width, height = _get_image_dimensions(image_bytes)
    original_path = save_media_file(
        image_bytes,
        filename=file.filename,
        content_type=file.content_type,
        blurred=False,
    )
    blurred_path = None
    if is_nsfw:
        blurred_path = save_media_file(
            blurred_bytes,
            filename=file.filename,
            content_type=file.content_type,
            blurred=True,
        )

    db_image = Image(
        original_path=original_path,
        blurred_path=blurred_path,
        original_filename=file.filename,
        mime_type=file.content_type or "image/jpeg",
        file_size=len(image_bytes),
        width=width,
        height=height,
        is_explicit=is_nsfw,
        moderation_score=confidence,
        status="explicit" if is_nsfw else "safe",
        author_id=current_user.id,
    )
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    return _image_response(db_image)


@router.get("/image/{image_id}", response_class=Response)
async def get_image(image_id: int, db: AsyncSession = Depends(get_db)):
    image = await db.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = image.blurred_path if image.status in ("explicit", "appealed") and image.blurred_path else image.original_path
    data = _load_image_bytes(file_path)
    return Response(content=data, media_type=image.mime_type or "image/jpeg")


@router.post("/image/{image_id}/appeal", response_model=ImageResponse)
async def appeal_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = await db.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to appeal this image")
    if image.status != "explicit":
        raise HTTPException(status_code=400, detail="Only explicit images can be appealed")

    image.status = "appealed"
    await db.commit()
    await db.refresh(image)
    return _image_response(image)


@router.get("/image_appeals", response_model=List[ImageResponse])
async def list_image_appeals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Image).where(Image.status == "appealed")
    result = await db.execute(stmt)
    images = result.scalars().all()
    return [_image_response(img) for img in images]


@router.put("/image/{image_id}/approve", response_model=ImageResponse)
async def approve_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = await db.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.status != "appealed":
        raise HTTPException(status_code=400, detail="Image is not currently appealed")

    image.status = "approved"
    image.is_explicit = False
    await db.commit()
    await db.refresh(image)
    return _image_response(image)


@router.get("/flagged", response_model=List[PostResponse])
async def list_flagged_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Post).where(Post.moderation_status == "flagged")
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.moderation_status != "flagged":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Post is not flagged (current status: {post.moderation_status})",
        )
    post.moderation_status = "approved"
    post.published = True
    await db.flush()
    await db.refresh(post)
    return post


@router.put("/{post_id}/reject", response_model=PostResponse)
async def reject_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.moderation_status not in ("flagged", "approved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Post cannot be rejected (current status: {post.moderation_status})",
        )
    post.moderation_status = "rejected"
    post.published = False
    await db.flush()
    await db.refresh(post)
    return post


@router.post("/image/upload-check", response_model=DeepAIUploadResponse)
async def upload_image_with_moderation(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.banned_until and current_user.banned_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"You are temporarily banned until {current_user.banned_until.isoformat()}. "
                "Repeated NSFW violations led to this restriction."
            ),
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    try:
        score = check_nsfw(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"NSFW check error: {exc}")

    decision = decide(score)
    status_map = {"BLOCK": "blocked", "REVIEW": "review", "ALLOW": "safe"}
    img_status = status_map[decision]
    is_explicit = decision == "BLOCK"
    width, height = _get_image_dimensions(image_bytes)
    original_path = save_media_file(
        image_bytes,
        filename=file.filename,
        content_type=file.content_type,
        blurred=False,
    )

    db_image = Image(
        original_path=original_path,
        blurred_path=None,
        original_filename=file.filename,
        mime_type=file.content_type or "image/jpeg",
        file_size=len(image_bytes),
        width=width,
        height=height,
        is_explicit=is_explicit,
        moderation_score=score,
        status=img_status,
        author_id=current_user.id,
    )
    db.add(db_image)
    await db.flush()
    await db.refresh(db_image)

    strike_info = None
    if decision == "BLOCK":
        strike_info = await update_strikes(current_user.id, db)

    return DeepAIUploadResponse(
        image_id=db_image.id,
        nsfw_score=score,
        decision=decision,
        status=img_status,
        strikes=strike_info["strikes"] if strike_info else None,
        banned=strike_info["banned"] if strike_info else None,
    )


@router.get("/image/review", response_model=list[ImageResponse])
async def list_review_images(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Image).where(Image.status == "review")
    result = await db.execute(stmt)
    images = result.scalars().all()
    return [_image_response(img) for img in images]
