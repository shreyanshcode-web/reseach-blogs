"""
Moderation API routes – preview check, admin review of flagged posts.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.ml.content_moderator import moderator
from app.models.post import Post
from app.models.user import User
from app.schemas.post_schema import (
    ModerationCheckRequest,
    ModerationCheckResponse,
    PostResponse,
)

router = APIRouter(prefix="/api/moderation", tags=["Moderation"])


@router.post("/check", response_model=ModerationCheckResponse)
async def check_content(data: ModerationCheckRequest):
    """Preview-check any text for inappropriate content (no auth required)."""
    result = moderator.check_text(data.text)
    return ModerationCheckResponse(
        label=result.label,
        confidence=result.confidence,
        status=result.status,
        reason=result.reason,
    )


from app.models.image import Image
from app.schemas.image_schema import ImageResponse


@router.post("/image", response_model=ImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload an image, check for NSFW content, and save to database."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    image_bytes = await file.read()
    
    try:
        from app.ml.image_moderator import image_moderator
        blurred_bytes, is_nsfw, confidence = image_moderator.process_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    status_str = "explicit" if is_nsfw else "safe"
    blurred_data = blurred_bytes if is_nsfw else None
    
    db_image = Image(
        original_data=image_bytes,
        blurred_data=blurred_data,
        is_explicit=is_nsfw,
        moderation_score=confidence,
        status=status_str,
        author_id=current_user.id
    )
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    
    return ImageResponse(
        id=db_image.id,
        is_explicit=db_image.is_explicit,
        moderation_score=db_image.moderation_score,
        status=db_image.status,
        created_at=db_image.created_at,
        author_id=db_image.author_id,
        view_url=f"/api/moderation/image/{db_image.id}"
    )

@router.get("/image/{image_id}", response_class=Response)
async def get_image(image_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve an image. Returns blurred version if explicit/appealed."""
    image = await db.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if image.status in ("explicit", "appealed") and image.blurred_data:
        data = image.blurred_data
    else:
        data = image.original_data
        
    return Response(content=data, media_type="image/jpeg")

@router.post("/image/{image_id}/appeal", response_model=ImageResponse)
async def appeal_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Appeal an image that was flagged as explicit."""
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
    
    return ImageResponse(
        id=image.id,
        is_explicit=image.is_explicit,
        moderation_score=image.moderation_score,
        status=image.status,
        created_at=image.created_at,
        author_id=image.author_id,
        view_url=f"/api/moderation/image/{image.id}"
    )

@router.get("/image_appeals", response_model=List[ImageResponse])
async def list_image_appeals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all appealed images (Admin)."""
    stmt = select(Image).where(Image.status == "appealed")
    result = await db.execute(stmt)
    images = result.scalars().all()
    
    return [
        ImageResponse(
            id=img.id,
            is_explicit=img.is_explicit,
            moderation_score=img.moderation_score,
            status=img.status,
            created_at=img.created_at,
            author_id=img.author_id,
            view_url=f"/api/moderation/image/{img.id}"
        ) for img in images
    ]

@router.put("/image/{image_id}/approve", response_model=ImageResponse)
async def approve_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve an appealed image, clearing the explicit flag (Admin)."""
    image = await db.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.status != "appealed":
        raise HTTPException(status_code=400, detail="Image is not currently appealed")
        
    image.status = "approved"
    image.is_explicit = False
    await db.commit()
    await db.refresh(image)
    
    return ImageResponse(
        id=image.id,
        is_explicit=image.is_explicit,
        moderation_score=image.moderation_score,
        status=image.status,
        created_at=image.created_at,
        author_id=image.author_id,
        view_url=f"/api/moderation/image/{image.id}"
    )


@router.get("/flagged", response_model=List[PostResponse])
async def list_flagged_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all posts with moderation_status='flagged' (admin review)."""
    stmt = select(Post).where(Post.moderation_status == "flagged")
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a flagged post (admin action)."""
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
    """Reject a flagged post (admin action)."""
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


# ── NSFW Pipeline (local model + strike system) ─────────────────

from datetime import datetime, timezone
from app.ml.deepai_moderator import check_nsfw, decide, update_strikes
from app.schemas.image_schema import DeepAIUploadResponse


@router.post("/image/upload-check", response_model=DeepAIUploadResponse)
async def upload_image_with_moderation(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image and check for NSFW content using the local ML model.

    Decision engine:
      - score > 0.85 → BLOCK (image saved, user gets a strike)
      - score > 0.6  → REVIEW (image saved, queued for admin review)
      - otherwise    → ALLOW (image saved as safe)

    Users with ≥ 3 strikes are auto-banned for 24 hours.
    """
    # ── Check if user is currently banned ──
    if current_user.banned_until and current_user.banned_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You are temporarily banned until {current_user.banned_until.isoformat()}. "
                   "Repeated NSFW violations led to this restriction.",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # ── Read image bytes ──
    image_bytes = await file.read()

    # ── Check NSFW via local model ──
    try:
        score = check_nsfw(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NSFW check error: {e}")

    decision = decide(score)

    # ── Map decision to Image status ──
    status_map = {"BLOCK": "blocked", "REVIEW": "review", "ALLOW": "safe"}
    img_status = status_map[decision]
    is_explicit = decision == "BLOCK"

    # ── Store in DB ──
    db_image = Image(
        original_data=image_bytes,
        blurred_data=None,
        is_explicit=is_explicit,
        moderation_score=score,
        status=img_status,
        author_id=current_user.id,
    )
    db.add(db_image)
    await db.flush()
    await db.refresh(db_image)

    # ── Strike system (only on BLOCK) ──
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
    """List all images pending admin review (status='review')."""
    stmt = select(Image).where(Image.status == "review")
    result = await db.execute(stmt)
    images = result.scalars().all()

    return [
        ImageResponse(
            id=img.id,
            is_explicit=img.is_explicit,
            moderation_score=img.moderation_score,
            status=img.status,
            created_at=img.created_at,
            author_id=img.author_id,
            view_url=f"/api/moderation/image/{img.id}",
        )
        for img in images
    ]

